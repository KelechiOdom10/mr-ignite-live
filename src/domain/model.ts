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

export const IgniteEventSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  ticker: z.string(),
  region: z.string(),
  stage: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  prizePoolUsd: z.number().nullable(),
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

export const STORED_SNAPSHOT_VERSION = 4;

export const StoredSnapshotSchema = z.object({
  version: z.literal(STORED_SNAPSHOT_VERSION),
  pages: z.record(z.string(), PageDataSchema),
  teams: z.record(z.string(), TeamInfoSchema),
  builtAt: z.iso.datetime(),
});
export type StoredSnapshot = z.infer<typeof StoredSnapshotSchema>;

export const SnapshotSchema = z.object({
  builtAt: z.iso.datetime(),
  servedAt: z.iso.datetime(),
  liquipediaUpdatedAt: z.iso.datetime().nullable(),
  events: z.array(IgniteEventSchema),
  matches: z.array(MatchSchema),
  teams: z.record(z.string(), TeamInfoSchema),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;
