import type { z } from "zod";

import type { Device, Uid } from "@/domain/player";

import {
  CareerResponseSchema,
  HeroCareerResponseSchema,
  HeroCatalogueSchema,
  LeaderboardResponseSchema,
  MatchDetailSchema,
  MatchHistoryResponseSchema,
  SearchResponseSchema,
} from "./schemas";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Competitive, as in each history row's `category.id`. */
export const COMPETITIVE = 2;

export interface EndpointParams {
  search: { name: string };
  career: { uid: Uid };
  heroCareer: { uid: Uid; heroId: number };
  history: { uid: Uid; page: number; category: number | null };
  match: { matchUid: string };
  leaderboard: { device: Device };
  heroes: Record<string, never>;
}

const SCHEMAS = {
  search: SearchResponseSchema,
  career: CareerResponseSchema,
  heroCareer: HeroCareerResponseSchema,
  history: MatchHistoryResponseSchema,
  match: MatchDetailSchema,
  leaderboard: LeaderboardResponseSchema,
  heroes: HeroCatalogueSchema,
} satisfies Record<keyof EndpointParams, z.ZodType>;

export type EndpointName = keyof EndpointParams;
export type ResponseOf<E extends EndpointName> = z.output<(typeof SCHEMAS)[E]>;

export interface Endpoint<E extends EndpointName> {
  /** Credits per call, from the spec's price for these exact params. */
  cost: number;
  /** null: the response never changes (finished matches). */
  ttlSeconds: number | null;
  schema: z.ZodType<ResponseOf<E>>;
  path: (params: EndpointParams[E]) => string;
}

// history and leaderboard prices depend on page size; these paths pin it to the priced size.
export const ENDPOINTS: { [E in EndpointName]: Endpoint<E> } = {
  search: {
    cost: 5,
    ttlSeconds: DAY,
    schema: SCHEMAS.search,
    path: ({ name }) => `/players/search?name=${encodeURIComponent(name)}`,
  },
  career: {
    cost: 10,
    ttlSeconds: 30 * MINUTE,
    schema: SCHEMAS.career,
    path: ({ uid }) => `/players/${uid}/career`,
  },
  heroCareer: {
    cost: 10,
    ttlSeconds: 6 * HOUR,
    schema: SCHEMAS.heroCareer,
    path: ({ uid, heroId }) => `/players/${uid}/heroes/${heroId}`,
  },
  history: {
    cost: 10,
    ttlSeconds: 15 * MINUTE,
    schema: SCHEMAS.history,
    path: ({ uid, page, category }) =>
      `/players/${uid}/match-history?page=${page}&page_size=20` +
      (category === null ? "" : `&category=${category}`),
  },
  match: {
    cost: 5,
    ttlSeconds: null,
    schema: SCHEMAS.match,
    path: ({ matchUid }) => `/matches/${encodeURIComponent(matchUid)}`,
  },
  leaderboard: {
    cost: 1,
    ttlSeconds: 5 * MINUTE,
    schema: SCHEMAS.leaderboard,
    path: ({ device }) => `/leaderboard?device_type=${device}&limit=100`,
  },
  heroes: {
    cost: 1,
    ttlSeconds: 7 * DAY,
    schema: SCHEMAS.heroes,
    path: () => "/heroes",
  },
};

/** Stable cache and ledger key: the request path is unique per endpoint and params. */
export function requestKey<E extends EndpointName>(name: E, params: EndpointParams[E]): string {
  const endpoint: Endpoint<E> = ENDPOINTS[name];
  return `${name}:${endpoint.path(params)}`;
}
