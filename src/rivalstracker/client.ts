import { z } from "zod";

import {
  ENDPOINTS,
  type Endpoint,
  type EndpointName,
  type EndpointParams,
  type ResponseOf,
} from "./endpoints";
import { errorFor, RivalsTrackerContractError, UpstreamUnavailableError } from "./errors";

export const RIVALSTRACKER_ORIGIN = "https://api.rivalstracker.com/api";

/** Identifying, and deliberately without an email address. The site publishes no API terms. */
const USER_AGENT = "RivalsHub/1.0 (personal, non-commercial)";

const TIMEOUT_MS = 10_000;

/** At most this many upstream requests may be open at once per isolate. */
export const MAX_CONCURRENT_REQUESTS = 2;

export interface RivalsTrackerClient {
  call<E extends EndpointName>(name: E, params: EndpointParams[E]): Promise<ResponseOf<E>>;
}

export function createRivalsTrackerClient(
  options: { fetch?: typeof fetch; timeoutMs?: number } = {},
): RivalsTrackerClient {
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  let active = 0;
  const waiting: (() => void)[] = [];

  function acquire(): Promise<void> | null {
    if (active < MAX_CONCURRENT_REQUESTS) {
      active += 1;

      return null;
    }

    return new Promise<void>((resolve) => {
      waiting.push(() => {
        active += 1;
        resolve();
      });
    });
  }

  async function withSlot<T>(run: () => Promise<T>): Promise<T> {
    const wait = acquire();

    if (wait) await wait;

    try {
      return await run();
    } finally {
      active -= 1;
      waiting.shift()?.();
    }
  }

  return {
    async call<E extends EndpointName>(name: E, params: EndpointParams[E]) {
      const endpoint: Endpoint<E> = ENDPOINTS[name];
      const request = endpoint.request(params);

      if (request === null) {
        return endpoint.schema.parse(endpoint.local?.());
      }

      const init: RequestInit = {
        method: request.method,
        headers:
          request.body === undefined
            ? { "User-Agent": USER_AGENT }
            : { "User-Agent": USER_AGENT, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      };

      if (request.body !== undefined) init.body = JSON.stringify(request.body);

      let res: Response;

      try {
        res = await withSlot(() => doFetch(RIVALSTRACKER_ORIGIN + request.path, init));
      } catch {
        throw new UpstreamUnavailableError("RivalsTracker didn't answer", 1);
      }

      const body: unknown = await res.json().catch(() => null);

      if (!res.ok) throw errorFor(res.status, 1);
      const parsed = endpoint.schema.safeParse(body);

      if (!parsed.success) {
        throw new RivalsTrackerContractError(name, z.prettifyError(parsed.error), 1);
      }

      return parsed.data;
    },
  };
}
