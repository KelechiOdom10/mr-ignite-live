import { z } from "zod";

import {
  ENDPOINTS,
  type Endpoint,
  type EndpointName,
  type EndpointParams,
  type ResponseOf,
} from "./endpoints";
import { errorFor, RivalsIslandContractError } from "./errors";
import { CreditHeaderSchema, ErrorBodySchema } from "./schemas";

export const RIVALSISLAND_ORIGIN = "https://api.rivalsisland.com";

const USER_AGENT =
  "RivalsHub/0.1 (personal Marvel Rivals site; contact via github.com/KelechiOdom10)";

export interface Charged<T> {
  data: T;
  /** Credits charged, from `x-credit-cost`; null when the header was missing. */
  cost: number | null;
  balance: number | null;
}

export interface RivalsIslandClient {
  call<E extends EndpointName>(name: E, params: EndpointParams[E]): Promise<Charged<ResponseOf<E>>>;
}

export function createRivalsIslandClient(options: {
  apiKey: string;
  fetch?: typeof fetch;
}): RivalsIslandClient {
  const doFetch = options.fetch ?? fetch;

  return {
    async call<E extends EndpointName>(name: E, params: EndpointParams[E]) {
      const endpoint: Endpoint<E> = ENDPOINTS[name];

      const res = await doFetch(RIVALSISLAND_ORIGIN + endpoint.path(params), {
        headers: { "x-api-key": options.apiKey, "User-Agent": USER_AGENT },
      });

      const cost = CreditHeaderSchema.parse(res.headers.get("x-credit-cost"));
      const balance = CreditHeaderSchema.parse(res.headers.get("x-credit-balance"));
      const body: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const parsed = ErrorBodySchema.safeParse(body);
        throw errorFor(res.status, parsed.success ? parsed.data.code : undefined, cost ?? 0);
      }

      const parsed = endpoint.schema.safeParse(body);

      if (!parsed.success) {
        throw new RivalsIslandContractError(name, z.prettifyError(parsed.error), cost ?? 0);
      }

      return { data: parsed.data, cost, balance };
    },
  };
}
