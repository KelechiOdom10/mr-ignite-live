import { describe, expect, it } from "vitest";

import {
  IGNITE_2026,
  filterDrafts,
  formatDeviations,
  summariseDrafts,
  toTeamDrafts,
  type TeamDraft,
} from "./draft";
import type { DraftAction, Hero, MapStats, MatchStats, PlayerStats } from "./stats";

const hero = (id: string): Hero => ({ id, name: id, role: null, portraitUrl: null });

function player(heroes: [string, number][]): PlayerStats {
  return {
    name: "p",
    nationality: null,
    hero: null,
    heroes: heroes.map(([id, playSeconds]) => ({ ...hero(id), playSeconds })),
    kills: 0,
    deaths: 0,
    assists: 0,
    finalHits: 0,
    damage: 0,
    damageTaken: 0,
    healing: 0,
    accuracy: null,
    isMvp: false,
    isSvp: false,
  };
}

function aMapStats(over: Partial<MapStats> & Pick<MapStats, "map">): MapStats {
  return {
    index: 1,
    durationSeconds: 600,
    teams: [
      {
        name: "A",
        won: true,
        score: 1,
        bans: [hero("loki")],
        players: [player([["mantis", 600]])],
      },
      { name: "B", won: false, score: 0, bans: [hero("loki")], players: [player([["hela", 600]])] },
    ],
    draft: null,
    ...over,
  };
}

const series = (maps: MapStats[]): MatchStats => ({
  matchId: "m1",
  source: "mrvl",
  sourceMatchId: "s1",
  sourceUpdatedAt: "1",
  fetchedAt: "2026-10-17T00:00:00.000Z",
  maps,
});

describe("summariseDrafts", () => {
  it("counts a hero both teams banned once per team draft but once per map for presence", () => {
    const summary = summariseDrafts(toTeamDrafts([series([aMapStats({ map: "Krakoa" })])]));
    const loki = summary.rows.find((r) => r.hero.id === "loki");
    expect(loki).toMatchObject({ banned: 2, played: 0, presentMaps: 1 });
  });

  it("ignores a hero swapped to for zero seconds", () => {
    const map = aMapStats({ map: "Krakoa" });
    map.teams[0].players = [
      player([
        ["mantis", 600],
        ["thor", 0],
      ]),
    ];
    const rows = summariseDrafts(toTeamDrafts([series([map])])).rows;
    expect(rows.find((r) => r.hero.id === "thor")).toBeUndefined();
  });

  it("only counts protects where the draft order was stored", () => {
    const protect: DraftAction = {
      phase: 1,
      side: 1,
      camp: 0,
      kind: "protect",
      hero: hero("mantis"),
    };
    const drafts = toTeamDrafts([
      series([
        aMapStats({ map: "Krakoa", draft: [protect] }),
        aMapStats({ map: "Midtown", index: 2 }),
      ]),
    ]);
    const summary = summariseDrafts(drafts);
    expect(summary.sample.withProtects).toBe(2);
    expect(summary.rows.find((r) => r.hero.id === "mantis")?.protected).toBe(1);
  });

  it("filters by map and by mode", () => {
    const drafts: TeamDraft[] = toTeamDrafts([
      series([aMapStats({ map: "Krakoa" }), aMapStats({ map: "Midtown", index: 2 })]),
    ]);
    expect(filterDrafts(drafts, { mode: "Convoy" }).map((d) => d.map)).toEqual([
      "Midtown",
      "Midtown",
    ]);
    expect(filterDrafts(drafts, { map: "Krakoa" })).toHaveLength(2);
  });
});

describe("formatDeviations", () => {
  it("reports a step taken by the wrong team", () => {
    const wrong: DraftAction[] = [
      { phase: 0, side: 1, camp: 0, kind: "ban", hero: hero("a") },
      { phase: 0, side: 2, camp: 1, kind: "ban", hero: hero("b") },
      { phase: 1, side: 2, camp: 1, kind: "protect", hero: hero("c") },
    ];
    const deviations = formatDeviations(wrong, IGNITE_2026);
    expect(deviations).toContain("step 1: camp 0 made no move, expected protect");
    expect(deviations).toContain("step 1: camp 1 made protect, expected no move");
  });
});

describe("formatDeviations past the end", () => {
  it("reports a step the format doesn't have", () => {
    const extra: DraftAction = { phase: 11, side: 1, camp: 0, kind: "ban", hero: hero("x") };
    expect(formatDeviations([extra], IGNITE_2026)).toContain("step 11 is past the format's end");
  });
});
