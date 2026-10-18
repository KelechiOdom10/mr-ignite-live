import { z } from "zod";

export const HeroSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string().nullable(),
  portraitUrl: z.string().nullable(),
});
export type Hero = z.infer<typeof HeroSchema>;

/** One hero's share of a player's map: mrvl splits a player's stats by hero. */
export const HeroLineSchema = z.object({
  kills: z.number(),
  deaths: z.number(),
  assists: z.number(),
  finalHits: z.number(),
  damage: z.number(),
  damageTaken: z.number(),
  healing: z.number(),
  accuracy: z.number().nullable(),
});
export type HeroLine = z.infer<typeof HeroLineSchema>;

export const HeroUsageSchema = HeroSchema.extend({
  playSeconds: z.number(),
  // Copies stored before per-hero lines were kept have none; they read as unknown, not zero.
  line: HeroLineSchema.nullish(),
});
export type HeroUsage = z.infer<typeof HeroUsageSchema>;

/**
 * Two lines for the same hero added together, as across the maps of a series. Accuracy can't be
 * added from percentages, so a sum has none; a missing line makes the sum unknown.
 */
export function addHeroLines(
  a: HeroLine | null | undefined,
  b: HeroLine | null | undefined,
): HeroLine | null {
  if (!a || !b) return null;
  return {
    kills: a.kills + b.kills,
    deaths: a.deaths + b.deaths,
    assists: a.assists + b.assists,
    finalHits: a.finalHits + b.finalHits,
    damage: a.damage + b.damage,
    damageTaken: a.damageTaken + b.damageTaken,
    healing: a.healing + b.healing,
    accuracy: null,
  };
}

export const PlayerStatsSchema = z.object({
  name: z.string(),
  nationality: z.string().nullable(),
  hero: HeroSchema.nullable(),
  heroes: z.array(HeroUsageSchema),
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

export interface SeriesPlayer extends PlayerStats {
  mvpCount: number;
  svpCount: number;
}

/**
 * One row per player across a series' maps: counts add up, each hero's time and line add up, and
 * accuracy is the first map's since percentages can't be summed.
 */
export function combinePlayers(teams: readonly TeamMapStats[]): SeriesPlayer[] {
  const byName = new Map<string, SeriesPlayer>();
  for (const team of teams) {
    for (const p of team.players) {
      const prev = byName.get(p.name);
      if (!prev) {
        byName.set(p.name, { ...p, mvpCount: p.isMvp ? 1 : 0, svpCount: p.isSvp ? 1 : 0 });
        continue;
      }
      const heroes = new Map(prev.heroes.map((h) => [h.id, { ...h }]));
      for (const h of p.heroes) {
        const existing = heroes.get(h.id);
        heroes.set(
          h.id,
          existing
            ? {
                ...existing,
                playSeconds: existing.playSeconds + h.playSeconds,
                line: addHeroLines(existing.line, h.line),
              }
            : h,
        );
      }
      byName.set(p.name, {
        ...prev,
        heroes: [...heroes.values()].sort((a, b) => b.playSeconds - a.playSeconds),
        kills: prev.kills + p.kills,
        deaths: prev.deaths + p.deaths,
        assists: prev.assists + p.assists,
        finalHits: prev.finalHits + p.finalHits,
        damage: prev.damage + p.damage,
        damageTaken: prev.damageTaken + p.damageTaken,
        healing: prev.healing + p.healing,
        accuracy: prev.accuracy,
        mvpCount: prev.mvpCount + (p.isMvp ? 1 : 0),
        svpCount: prev.svpCount + (p.isSvp ? 1 : 0),
      });
    }
  }
  return [...byName.values()];
}
