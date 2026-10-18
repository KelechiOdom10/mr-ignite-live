import { defineHandler, defineHead, type InferProps } from "void";

import { IGNITE_2026 } from "@/domain/draft";
import { HERO_ROSTER, ROSTER_ICONS } from "@/domain/heroRoster";
import { scopeSnapshot } from "@/domain/scope";

import { currentSnapshot, readAllStats } from "../../src/sync";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async () => {
  const [full, stats] = await Promise.all([currentSnapshot(), readAllStats()]);
  const portraits = new Map<string, string>();
  for (const map of stats.flatMap((s) => s.maps)) {
    for (const team of map.teams) {
      for (const hero of [...team.bans, ...team.players.flatMap((p) => p.heroes)]) {
        if (hero.portraitUrl) portraits.set(hero.id, hero.portraitUrl);
      }
    }
  }
  return {
    snapshot: scopeSnapshot(full, { kind: "events" }, Date.now()),
    format: IGNITE_2026,
    heroes: HERO_ROSTER.map((h) => ({
      ...h,
      portraitUrl: portraits.get(h.id) ?? ROSTER_ICONS[h.id] ?? null,
    })),
  };
});

export const head = defineHead(() => ({ title: "Draft simulator" }));
