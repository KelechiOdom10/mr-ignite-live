import { z } from "zod";

import { isUnrecordedHero, resolveHero } from "./heroRoster";
import { knownMap } from "./maps";

export const ProHeroStatSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    role: z.string().nullable(),
    portraitUrl: z.string().nullable(),
    games: z.number().int().nonnegative(),
    /** Share of the play time the hero was available for; null when it was never available. */
    pickRate: z.number().nullable(),
    /** Of every team-game in the group. */
    banRate: z.number().nullable(),
    protectRate: z.number().nullable(),
    /** Winning play time over total play time; null before the hero was played. */
    winRate: z.number().nullable(),
  })
  .transform((stat) => ({ ...stat, ...resolveHero(stat) }));

export type ProHeroStat = z.infer<typeof ProHeroStatSchema>;

export const ProHeroGroupSchema = z.object({
  /** "overall" or the map catalogue key `knownMap` resolved. */
  map: z.string(),
  games: z.number().int().nonnegative(),
  heroes: z
    .array(ProHeroStatSchema)
    .transform((heroes) => heroes.filter((hero) => !isUnrecordedHero(hero))),
});

export type ProHeroGroup = z.infer<typeof ProHeroGroupSchema>;

export const ProHeroStatsSchema = z.object({
  window: z.object({ start: z.string(), end: z.string() }),
  fetchedAt: z.string(),
  groups: z.array(ProHeroGroupSchema),
});

export type ProHeroStats = z.infer<typeof ProHeroStatsSchema>;

export interface HeroMatrixCell {
  heroId: string;
  heroName: string;
  playTimeSeconds: number;
  totalAvailablePlayTimeSeconds: number;
  heroGames: number;
  banCount: number;
  protectCount: number;
  bannedAgainstCount: number;
  protectedAgainstCount: number;
  weightedWinRate: number;
}

export interface HeroMatrixRow {
  groupId: string;
  groupLabel: string;
  isOverall?: boolean | null | undefined;
  eligibleGames: number;
  gameCount: number;
  cellsByHeroId: Record<string, HeroMatrixCell>;
}

export interface HeroMatrixHero {
  heroId: string;
  heroName: string;
  portraitUrl?: string | null | undefined;
  role?: string | null | undefined;
}

export interface HeroMatrixResponse {
  dimension: string;
  metric: string;
  heroes: readonly HeroMatrixHero[];
  rows: readonly HeroMatrixRow[];
}

export interface HeroMatrixWindow {
  start: string;
  end: string;
  fetchedAt: string;
}

function ratio(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}

/**
 * mrvl's group ids are not the map names (`god-quarry` is labelled "Thebes", and
 * `god-quarry-domination` is God Quarry), so the label decides which map a group is.
 */
function groupKey(row: HeroMatrixRow): string {
  if (row.isOverall === true) return "overall";

  return knownMap(row.groupLabel)?.name ?? row.groupLabel;
}

function toHero(cell: HeroMatrixCell, hero: HeroMatrixHero, row: HeroMatrixRow): ProHeroStat {
  return {
    id: hero.heroId,
    name: hero.heroName,
    role: hero.role ?? null,
    portraitUrl: hero.portraitUrl ?? null,
    games: cell.heroGames,
    pickRate: ratio(cell.playTimeSeconds, cell.totalAvailablePlayTimeSeconds),
    banRate: ratio(cell.banCount, row.eligibleGames),
    protectRate: ratio(cell.protectCount, row.eligibleGames),
    winRate: cell.playTimeSeconds > 0 ? cell.weightedWinRate : null,
  };
}

export function toProHeroStats(
  response: HeroMatrixResponse,
  window: HeroMatrixWindow,
): ProHeroStats {
  const groups = response.rows.map((row) => {
    const heroes = ProHeroGroupSchema.shape.heroes.parse(
      response.heroes.flatMap((hero) => {
        const cell = row.cellsByHeroId[hero.heroId];

        return cell ? [toHero(cell, hero, row)] : [];
      }),
    );

    heroes.sort(
      (a, b) =>
        b.games - a.games || (b.pickRate ?? 0) - (a.pickRate ?? 0) || a.name.localeCompare(b.name),
    );

    return { map: groupKey(row), games: row.gameCount, heroes };
  });

  return { window: { start: window.start, end: window.end }, fetchedAt: window.fetchedAt, groups };
}

export const WIN_RATE_MIN_GAMES = 10;

/** Below ten games the sample is too small to read as a rate, so the table shows "—". */
export function shownWinRate(hero: ProHeroStat): number | null {
  return hero.games >= WIN_RATE_MIN_GAMES ? hero.winRate : null;
}

/** The group the page's map filter selects; no filter means the Overall group. */
export function proHeroGroupFor(
  groups: readonly ProHeroGroup[],
  map: string | null | undefined,
): ProHeroGroup | null {
  if (!map) return groups.find((g) => g.map === "overall") ?? null;
  const key = knownMap(map)?.name ?? map;

  return groups.find((g) => g.map === key) ?? null;
}
