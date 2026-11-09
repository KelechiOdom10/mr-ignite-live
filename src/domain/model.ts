import { z } from "zod";

export const TeamSchema = z.object({
  name: z.string().min(1),
  short: z.string().min(1),
});

export type Team = z.infer<typeof TeamSchema>;

export const MapWinnerSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);

export type MapWinner = z.infer<typeof MapWinnerSchema>;

export const MapResultSchema = z.object({
  index: z.number().int().positive(),
  map: z.string(),
  score1: z.number().nullable(),
  score2: z.number().nullable(),
  winner: MapWinnerSchema,
  vod: z.string().nullable(),
});

export type MapResult = z.infer<typeof MapResultSchema>;

export const MatchSchema = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  phase: z.string(),
  round: z.string(),
  bestOf: z.number().int().positive(),
  startsAt: z.iso.datetime().nullable(),
  team1: TeamSchema.nullable(),
  team2: TeamSchema.nullable(),
  maps: z.array(MapResultSchema),
  markedFinished: z.boolean(),
  twitch: z.string().nullable(),
  youtube: z.string().nullable(),
});

export type Match = z.infer<typeof MatchSchema>;

export const PrizePlacementSchema = z.object({
  place: z.number().int().positive(),
  prizeUsd: z.number().nonnegative(),
  /** Teams sharing this place; a `{{Slot|count=2}}` covers two places at one prize. */
  count: z.number().int().positive(),
  team: TeamSchema.nullable(),
});

export type PrizePlacement = z.infer<typeof PrizePlacementSchema>;

export const IgniteEventSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  ticker: z.string(),
  region: z.string(),
  stage: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  prizePoolUsd: z.number().nullable(),
  prizes: z.array(PrizePlacementSchema),
  liquipediaUrl: z.url(),
  updatedAt: z.iso.datetime(),
  iconFile: z.string().nullable(),
  iconUrl: z.url().nullable(),
});

export type IgniteEvent = z.infer<typeof IgniteEventSchema>;

export const TeamInfoSchema = z.object({
  short: z.string().min(1),
  logoDark: z.url().nullable(),
  logoLight: z.url().nullable(),
});

export type TeamInfo = z.infer<typeof TeamInfoSchema>;

export const PageDataSchema = z.object({
  revid: z.number().int(),
  updatedAt: z.iso.datetime(),
  event: IgniteEventSchema.nullable(),
  matches: z.array(MatchSchema),
});

export type PageData = z.infer<typeof PageDataSchema>;

export const MapOverrideSchema = MapResultSchema.omit({ vod: true });

export type MapOverride = z.infer<typeof MapOverrideSchema>;

export const STORED_SNAPSHOT_VERSION = 7;

export const StoredSnapshotSchema = z.object({
  version: z.literal(STORED_SNAPSHOT_VERSION),
  pages: z.record(z.string(), PageDataSchema),
  teams: z.record(z.string(), TeamInfoSchema),
  /** Map results seen on mrvl before Liquipedia records them, keyed by match id. */
  mapOverrides: z.record(z.string(), z.array(MapOverrideSchema)),
  builtAt: z.iso.datetime(),
});

export type StoredSnapshot = z.infer<typeof StoredSnapshotSchema>;

export const SnapshotEventSchema = IgniteEventSchema.extend({
  /** True when at least one place came from the bracket rather than a Liquipedia opponent. */
  prizesDerived: z.boolean(),
});

export type SnapshotEvent = z.infer<typeof SnapshotEventSchema>;

export const SnapshotSchema = z.object({
  builtAt: z.iso.datetime(),
  servedAt: z.iso.datetime(),
  liquipediaUpdatedAt: z.iso.datetime().nullable(),
  events: z.array(SnapshotEventSchema),
  matches: z.array(MatchSchema),
  teams: z.record(z.string(), TeamInfoSchema),
});

export type Snapshot = z.infer<typeof SnapshotSchema>;
