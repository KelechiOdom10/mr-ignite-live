import { z } from "zod";

export const HeroSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string().nullable(),
  portraitUrl: z.string().nullable(),
});
export type Hero = z.infer<typeof HeroSchema>;

export const PlayerStatsSchema = z.object({
  name: z.string(),
  nationality: z.string().nullable(),
  hero: HeroSchema.nullable(),
  heroes: z.array(HeroSchema.extend({ playSeconds: z.number() })),
  kills: z.number(),
  deaths: z.number(),
  assists: z.number(),
  finalHits: z.number(),
  damage: z.number(),
  damageTaken: z.number(),
  healing: z.number(),
  accuracy: z.number().nullable(),
  isMvp: z.boolean(),
  isSvp: z.boolean(),
});
export type PlayerStats = z.infer<typeof PlayerStatsSchema>;

export const TeamMapStatsSchema = z.object({
  name: z.string(),
  won: z.boolean(),
  score: z.number().nullable(),
  bans: z.array(HeroSchema),
  players: z.array(PlayerStatsSchema),
});
export type TeamMapStats = z.infer<typeof TeamMapStatsSchema>;

export const DraftActionSchema = z.object({
  /** The game's draft step; both teams act in some steps. */
  phase: z.number().int().nonnegative(),
  /** 1 or 2, in the Liquipedia match's team order. */
  side: z.union([z.literal(1), z.literal(2)]),
  /** The lobby's team camp, which decides who acts in each step. */
  camp: z.number().int(),
  kind: z.enum(["ban", "protect"]),
  hero: HeroSchema,
});
export type DraftAction = z.infer<typeof DraftActionSchema>;

export const MapStatsSchema = z.object({
  index: z.number().int().positive(),
  map: z.string(),
  durationSeconds: z.number().nullable(),
  /** Ordered to match the Liquipedia match's team1, team2. */
  teams: z.tuple([TeamMapStatsSchema, TeamMapStatsSchema]),
  /** Bans and protects in draft order; null for maps stored before it was kept, or without a timeline. */
  draft: z.array(DraftActionSchema).nullable().default(null),
});
export type MapStats = z.infer<typeof MapStatsSchema>;

export const MatchStatsSchema = z.object({
  matchId: z.string(),
  source: z.literal("mrvl"),
  sourceMatchId: z.string(),
  sourceUpdatedAt: z.string(),
  fetchedAt: z.iso.datetime(),
  maps: z.array(MapStatsSchema),
});
export type MatchStats = z.infer<typeof MatchStatsSchema>;
