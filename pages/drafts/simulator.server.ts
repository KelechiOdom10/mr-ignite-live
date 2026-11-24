import { defineHandler, defineHead, type InferProps } from "void";

import { IGNITE_2026, statsFollowingFormat, summariseDrafts, toTeamDrafts } from "@/domain/draft";
import { parseSimFormatId, SIM_FORMATS } from "@/domain/draftFormat";
import { proRates } from "@/domain/draftSim";
import { HERO_ROSTER, ROSTER_ICONS } from "@/domain/heroRoster";
import { scopeSnapshot } from "@/domain/scope";
import { parseSimMap, simMapOptions } from "@/domain/simMap";

import { currentSnapshot, readAllStats, readProHeroStats } from "../../src/sync";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const [full, stats] = await Promise.all([currentSnapshot(), readAllStats()]);
  // After currentSnapshot: on a cold store that call runs the sync that writes the hero totals.
  const heroMatrix = await readProHeroStats();
  const portraits = new Map<string, string>();

  for (const map of stats.flatMap((s) => s.maps)) {
    for (const team of map.teams) {
      for (const hero of [...team.bans, ...team.players.flatMap((p) => p.heroes)]) {
        if (hero.portraitUrl) portraits.set(hero.id, hero.portraitUrl);
      }
    }
  }

  const summary = summariseDrafts(toTeamDrafts(statsFollowingFormat(stats, IGNITE_2026)));
  const maps = simMapOptions(heroMatrix);

  return {
    snapshot: scopeSnapshot(full, { kind: "events" }, Date.now()),
    formatId: parseSimFormatId(c.req.query("format")),
    formats: SIM_FORMATS,
    rates: proRates(summary),
    proDrafts: summary.sample.teamDrafts,
    heroMatrix,
    map: parseSimMap(c.req.query("map"), maps),
    maps,
    heroes: HERO_ROSTER.map(({ gameId: _, ...h }) => ({
      ...h,
      portraitUrl: portraits.get(h.id) ?? ROSTER_ICONS.get(h.id) ?? null,
    })),
  };
});

export const head = defineHead(() => ({ title: "Draft simulator" }));
