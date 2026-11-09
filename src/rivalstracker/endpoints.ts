import type { z } from "zod";

import type { Device, Uid } from "@/domain/player";

import { HERO_CATALOGUE } from "./heroes";
import {
  FindPlayerResponseSchema,
  HeroesResponseSchema,
  LeaderboardResponseSchema,
  MatchResponseSchema,
  PlayerResponseSchema,
} from "./schemas";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** RivalsTracker's device ids, from the site's filter buttons. */
const DEVICE_IDS: Record<Device, number> = { pc: 1, ps: 2, xbox: 4 };

export interface EndpointParams {
  search: { name: string };
  career: { uid: Uid };
  heroCareer: { uid: Uid; heroId: number };
  history: { uid: Uid };
  match: { matchUid: string };
  leaderboard: { device: Device };
  heroes: Record<string, never>;
}

const SCHEMAS = {
  search: FindPlayerResponseSchema,
  career: PlayerResponseSchema,
  heroCareer: PlayerResponseSchema,
  history: PlayerResponseSchema,
  match: MatchResponseSchema,
  leaderboard: LeaderboardResponseSchema,
  heroes: HeroesResponseSchema,
} satisfies Record<keyof EndpointParams, z.ZodType>;

export type EndpointName = keyof EndpointParams;

export type ResponseOf<E extends EndpointName> = z.output<(typeof SCHEMAS)[E]>;

export interface UpstreamRequest {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
}

export interface Endpoint<E extends EndpointName> {
  /** Requests per call. One upstream request, however many page endpoints share it. */
  cost: 1;
  /** null: the response never changes (finished matches) or never leaves the process (heroes). */
  ttlSeconds: number | null;
  schema: z.ZodType<ResponseOf<E>>;
  /** null: served from `local` without a request. */
  request: (params: EndpointParams[E]) => UpstreamRequest | null;
  local?: () => ResponseOf<E>;
}

export type EndpointRegistry = { [E in EndpointName]: Endpoint<E> };

const player = ({ uid }: { uid: Uid }): UpstreamRequest => ({
  method: "GET",
  path: `/player/${uid}`,
});

export const ENDPOINTS: EndpointRegistry = {
  search: {
    cost: 1,
    ttlSeconds: DAY,
    schema: SCHEMAS.search,
    request: ({ name }) => ({
      method: "POST",
      path: "/find-player",
      body: { name },
    }),
  },
  career: {
    cost: 1,
    ttlSeconds: 30 * MINUTE,
    schema: SCHEMAS.career,
    request: player,
  },
  heroCareer: {
    cost: 1,
    ttlSeconds: 30 * MINUTE,
    schema: SCHEMAS.heroCareer,
    request: player,
  },
  history: {
    cost: 1,
    ttlSeconds: 30 * MINUTE,
    schema: SCHEMAS.history,
    request: player,
  },
  match: {
    cost: 1,
    ttlSeconds: null,
    schema: SCHEMAS.match,
    request: ({ matchUid }) => ({
      method: "GET",
      path: `/matches/${encodeURIComponent(matchUid)}`,
    }),
  },
  leaderboard: {
    cost: 1,
    ttlSeconds: 15 * MINUTE,
    schema: SCHEMAS.leaderboard,
    request: ({ device }) => ({
      method: "GET",
      path: `/leaderboard/data?device=${DEVICE_IDS[device]}&season=last`,
    }),
  },
  heroes: {
    cost: 1,
    ttlSeconds: null,
    schema: SCHEMAS.heroes,
    request: () => null,
    local: () => ({ heroes: [...HERO_CATALOGUE] }),
  },
};

/** Stable cache and ledger key: one upstream request, shared by every endpoint that reads it. */
export function requestKey<E extends EndpointName>(name: E, params: EndpointParams[E]): string {
  const endpoint: Endpoint<E> = ENDPOINTS[name];
  const request = endpoint.request(params);

  if (request === null) return "local";
  // A POST's body is part of its identity: two names must not share one cached answer.
  const body = request.body === undefined ? "" : `:${JSON.stringify(request.body)}`;

  return `${request.method} ${request.path}${body}`;
}
