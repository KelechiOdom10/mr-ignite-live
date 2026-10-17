import type { RivalsIslandClient } from "@/rivalsisland/client";
import {
  ENDPOINTS,
  requestKey,
  type Endpoint,
  type EndpointName,
  type EndpointParams,
  type ResponseOf,
} from "@/rivalsisland/endpoints";
import {
  CareerPrivateError,
  CreditBudgetExceededError,
  MatchHistoryPrivateError,
  NotFoundError,
  RivalsIslandContractError,
  RivalsIslandError,
  UpstreamUnavailableError,
} from "@/rivalsisland/errors";

const NEGATIVE_TTL_MS = 30 * 60 * 1000;

export type CachedStatus = "ok" | "history_private" | "career_private" | "not_found" | "broken";

export interface CachedResponse {
  status: CachedStatus;
  /** The validated response for `ok`; null otherwise. */
  body: unknown;
  fetchedAt: number;
  /** null: never expires. */
  expiresAt: number | null;
}

export interface PlayerCache {
  get(key: string): Promise<CachedResponse | null>;
  put(key: string, endpoint: EndpointName, entry: CachedResponse): Promise<void>;
}

export interface Reservation {
  endpoint: EndpointName;
  key: string;
  expected: number;
  budget: number;
  at: number;
}

export interface Settlement {
  cost: number;
  balance: number | null;
  httpStatus: number;
}

export interface CreditLedger {
  /** Atomically records `expected` as pending unless settled plus pending credits would pass `budget`. Returns null when refused. */
  reserve(reservation: Reservation): Promise<number | null>;
  settle(id: number, settlement: Settlement): Promise<void>;
  summary(): Promise<{ spent: number; pending: number; balance: number | null }>;
}

export interface Fetched<T> {
  data: T;
  fetchedAt: number;
  /** Past its TTL; shown with its age and a priced refresh. */
  stale: boolean;
  /** A refresh was asked for but refused or failed, so this is the older copy. */
  refreshFailed: boolean;
}

export interface PlayerDataOptions {
  client: RivalsIslandClient;
  cache: PlayerCache;
  ledger: CreditLedger;
  budget: number;
  now: () => number;
}

/** Endpoints a visit may refetch on its own once expired; the rest wait for an explicit refresh. */
const REFETCH_ON_VISIT: ReadonlySet<EndpointName> = new Set(["search", "leaderboard", "heroes"]);

function negativeError(status: CachedStatus): RivalsIslandError | null {
  if (status === "history_private")
    return new MatchHistoryPrivateError("Match history is private", 0);
  if (status === "career_private") return new CareerPrivateError("Career is private", 0);
  if (status === "not_found") return new NotFoundError("Not found on RivalsIsland", 0);
  if (status === "broken") {
    return new UpstreamUnavailableError("RivalsIsland's last answer didn't match our schema", 0);
  }
  return null;
}

function negativeStatus(error: unknown): CachedStatus | null {
  if (error instanceof MatchHistoryPrivateError) return "history_private";
  if (error instanceof CareerPrivateError) return "career_private";
  if (error instanceof NotFoundError) return "not_found";
  // A changed response would fail again; remembering it stops a paid retry on every view.
  if (error instanceof RivalsIslandContractError) return "broken";
  return null;
}

export function createPlayerData(options: PlayerDataOptions) {
  const { client, cache, ledger, budget, now } = options;
  const inFlight = new Map<string, Promise<unknown>>();

  function fromCache<E extends EndpointName>(
    name: E,
    entry: CachedResponse,
    refreshFailed = false,
  ): Fetched<ResponseOf<E>> {
    const negative = negativeError(entry.status);
    if (negative) throw negative;
    const endpoint: Endpoint<E> = ENDPOINTS[name];
    const stale = entry.expiresAt !== null && entry.expiresAt <= now();
    const data = endpoint.schema.parse(entry.body);
    return { data, fetchedAt: entry.fetchedAt, stale, refreshFailed };
  }

  async function fetchAndStore<E extends EndpointName>(
    name: E,
    params: EndpointParams[E],
    key: string,
    fallback: CachedResponse | null,
  ): Promise<Fetched<ResponseOf<E>>> {
    const endpoint: Endpoint<E> = ENDPOINTS[name];
    const at = now();
    const id = await ledger.reserve({ endpoint: name, key, expected: endpoint.cost, budget, at });
    if (id === null) {
      if (fallback?.status === "ok") return fromCache(name, fallback, true);
      throw new CreditBudgetExceededError(endpoint.cost, budget);
    }
    let charged: Awaited<ReturnType<typeof client.call<E>>>;
    try {
      charged = await client.call(name, params);
    } catch (error) {
      await ledger.settle(id, {
        cost: error instanceof RivalsIslandError ? error.creditCost : 0,
        balance: null,
        httpStatus: 0,
      });
      const status = negativeStatus(error);
      if (status === "broken" && fallback?.status === "ok") {
        // Keep the last good copy readable, and hold off paying for another broken answer.
        await cache.put(key, name, { ...fallback, expiresAt: at + NEGATIVE_TTL_MS });
        return fromCache(name, fallback, true);
      }
      if (status) {
        await cache.put(key, name, {
          status,
          body: null,
          fetchedAt: at,
          expiresAt: at + NEGATIVE_TTL_MS,
        });
      } else if (fallback?.status === "ok") {
        console.warn(
          JSON.stringify({ event: "rivalsisland_failed_serving_stale", endpoint: name }),
        );
        return fromCache(name, fallback, true);
      }
      throw error;
    }
    const { data, cost, balance } = charged;
    if (cost !== null && cost !== endpoint.cost) {
      console.warn(JSON.stringify({ event: "credit_cost_mismatch", endpoint: name, cost }));
    }
    await ledger.settle(id, { cost: cost ?? endpoint.cost, balance, httpStatus: 200 });
    const expiresAt = endpoint.ttlSeconds === null ? null : at + endpoint.ttlSeconds * 1000;
    await cache.put(key, name, { status: "ok", body: data, fetchedAt: at, expiresAt });
    return { data, fetchedAt: at, stale: false, refreshFailed: false };
  }

  return {
    async get<E extends EndpointName>(
      name: E,
      params: EndpointParams[E],
      { refresh = false }: { refresh?: boolean } = {},
    ): Promise<Fetched<ResponseOf<E>>> {
      const key = requestKey(name, params);
      const cached = await cache.get(key);
      if (cached && !refresh) {
        const fresh = cached.expiresAt === null || cached.expiresAt > now();
        const keepStale = cached.status === "ok" && !REFETCH_ON_VISIT.has(name);
        if (fresh || keepStale) return fromCache(name, cached);
      }
      const running = inFlight.get(key);
      // SAFETY: inFlight is keyed by requestKey(name, params), which includes the endpoint name, so a hit holds a promise for this same E.
      if (running) return running as Promise<Fetched<ResponseOf<E>>>;
      const request = fetchAndStore(name, params, key, cached).finally(() => inFlight.delete(key));
      inFlight.set(key, request);
      return request;
    },
    credits: () => ledger.summary(),
  };
}

export type PlayerData = ReturnType<typeof createPlayerData>;
