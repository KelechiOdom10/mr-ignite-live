import type { RivalsTrackerClient } from "@/rivalstracker/client";
import {
  ENDPOINTS,
  requestKey,
  type Endpoint,
  type EndpointName,
  type EndpointParams,
  type ResponseOf,
} from "@/rivalstracker/endpoints";
import {
  NotFoundError,
  RequestBudgetExceededError,
  RivalsTrackerContractError,
  RivalsTrackerError,
  UpstreamUnavailableError,
} from "@/rivalstracker/errors";

const NEGATIVE_TTL_MS = 30 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type CachedStatus = "ok" | "not_found" | "broken";

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
  /** Only reservations at or after this instant count against the budget. */
  since: number;
}

export interface Settlement {
  cost: number;
  httpStatus: number;
}

export interface RequestLedger {
  /** Atomically records `expected` unless today's settled plus pending requests would pass `budget`. Returns null when refused. */
  reserve(reservation: Reservation): Promise<number | null>;
  settle(id: number, settlement: Settlement): Promise<void>;
  summary(since: number): Promise<{ spent: number; pending: number }>;
}

export interface Fetched<T> {
  data: T;
  fetchedAt: number;
  /** Past its TTL; shown with its age and a refresh control. */
  stale: boolean;
  /** A refresh was asked for but refused or failed, so this is the older copy. */
  refreshFailed: boolean;
}

export interface PlayerDataOptions {
  client: RivalsTrackerClient;
  cache: PlayerCache;
  ledger: RequestLedger;
  budget: number;
  now: () => number;
}

/** Endpoints a visit may refetch on its own once expired; the rest wait for an explicit refresh. */
const REFETCH_ON_VISIT: ReadonlySet<EndpointName> = new Set(["search", "leaderboard"]);

function dayStart(at: number): number {
  return Math.floor(at / DAY_MS) * DAY_MS;
}

function negativeError(status: CachedStatus): RivalsTrackerError | null {
  if (status === "not_found") return new NotFoundError("Not found on RivalsTracker", 0);

  if (status === "broken") {
    return new UpstreamUnavailableError("RivalsTracker's last answer didn't match our schema", 0);
  }

  return null;
}

function negativeStatus(cause: unknown): CachedStatus | null {
  if (cause instanceof NotFoundError) return "not_found";

  // A changed response would fail again; remembering it stops a retry on every view.
  if (cause instanceof RivalsTrackerContractError) return "broken";

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

  function local<E extends EndpointName>(name: E): Fetched<ResponseOf<E>> | null {
    const endpoint: Endpoint<E> = ENDPOINTS[name];

    if (endpoint.local === undefined) return null;

    return {
      data: endpoint.schema.parse(endpoint.local()),
      fetchedAt: now(),
      stale: false,
      refreshFailed: false,
    };
  }

  async function fetchAndStore<E extends EndpointName>(
    name: E,
    params: EndpointParams[E],
    key: string,
    fallback: CachedResponse | null,
  ): Promise<Fetched<ResponseOf<E>>> {
    const endpoint: Endpoint<E> = ENDPOINTS[name];
    const at = now();

    const id = await ledger.reserve({
      endpoint: name,
      key,
      expected: endpoint.cost,
      budget,
      at,
      since: dayStart(at),
    });

    if (id === null) {
      if (fallback?.status === "ok") return fromCache(name, fallback, true);
      throw new RequestBudgetExceededError(endpoint.cost, budget);
    }

    let data: ResponseOf<E>;

    try {
      data = await client.call(name, params);
    } catch (error) {
      await ledger.settle(id, {
        // A failed request still reached RivalsTracker, unless it never left the process.
        cost: error instanceof RivalsTrackerError ? error.requests : 1,
        httpStatus: 0,
      });
      const status = negativeStatus(error);

      if (status === "broken" && fallback?.status === "ok") {
        // Keep the last good copy readable, and hold off retrying a broken answer.
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
          JSON.stringify({ event: "rivalstracker_failed_serving_stale", endpoint: name }),
        );

        return fromCache(name, fallback, true);
      }

      throw error;
    }

    await ledger.settle(id, { cost: endpoint.cost, httpStatus: 200 });
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
      const localData = local(name);

      if (localData) return localData;
      const key = requestKey(name, params);
      const cached = await cache.get(key);

      if (cached && !refresh) {
        const fresh = cached.expiresAt === null || cached.expiresAt > now();
        const keepStale = cached.status === "ok" && !REFETCH_ON_VISIT.has(name);

        if (fresh || keepStale) return fromCache(name, cached);
      }

      const running = inFlight.get(key);

      if (running) {
        // SAFETY: inFlight is keyed by requestKey(name, params), so a hit holds a promise for this same request.
        return running as Promise<Fetched<ResponseOf<E>>>;
      }

      const request = fetchAndStore(name, params, key, cached).finally(() => inFlight.delete(key));
      inFlight.set(key, request);

      return request;
    },
    /** What the cache already holds, without calling RivalsTracker or touching the budget. */
    async peek<E extends EndpointName>(
      name: E,
      params: EndpointParams[E],
    ): Promise<Fetched<ResponseOf<E>> | null> {
      const localData = local(name);

      if (localData) return localData;
      const cached = await cache.get(requestKey(name, params));

      if (cached?.status !== "ok") return null;
      const endpoint: Endpoint<E> = ENDPOINTS[name];
      // An entry saved before a schema change shouldn't take down a page that only peeks at it.
      const parsed = endpoint.schema.safeParse(cached.body);

      if (!parsed.success) return null;
      const stale = cached.expiresAt !== null && cached.expiresAt <= now();

      return { data: parsed.data, fetchedAt: cached.fetchedAt, stale, refreshFailed: false };
    },
    usage: () => ledger.summary(dayStart(now())),
  };
}

export type PlayerData = ReturnType<typeof createPlayerData>;
