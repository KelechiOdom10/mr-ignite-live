import { z } from "zod";

import type { ProRate } from "./draftSim";
import { knownMap } from "./maps";
import {
  type ProHeroGroup,
  type ProHeroStats,
  proHeroGroupFor,
  shownWinRate,
} from "./proHeroStats";

export function simMapOptions(stats: ProHeroStats | null): string[] {
  if (!stats) return [];

  return stats.groups
    .flatMap((group) => (group.map === "overall" ? [] : [group.map]))
    .sort((a, b) => a.localeCompare(b));
}

const SimMapQuery = z.string().optional().nullable().catch(null);

export function parseSimMap(
  value: string | null | undefined,
  maps: readonly string[],
): string | null {
  const raw = SimMapQuery.parse(value)?.trim();

  if (!raw) return null;

  const key = knownMap(raw)?.name ?? raw;

  return maps.includes(key) ? key : null;
}

export interface SimMapRates {
  group: ProHeroGroup;
  rates: Record<string, ProRate>;
}

export function simMapRates(stats: ProHeroStats | null, map: string | null): SimMapRates | null {
  const group = stats ? proHeroGroupFor(stats.groups, map) : null;

  if (!group) return null;

  const rates: Record<string, ProRate> = {};

  for (const hero of group.heroes) {
    if (hero.banRate === null) continue;

    rates[hero.id] = {
      banned: hero.banRate,
      protected: hero.protectRate,
      pick: hero.pickRate,
      win: shownWinRate(hero),
    };
  }

  return { group, rates };
}
