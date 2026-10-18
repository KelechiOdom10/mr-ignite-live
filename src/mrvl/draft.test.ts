import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  IGNITE_2026,
  bansBroken,
  draftCoverage,
  formatDeviations,
  summariseDrafts,
  toTeamDrafts,
} from "@/domain/draft";
import { type SimMove, applyMove, currentTurn, moveProblem, outcome } from "@/domain/draftSim";
import { HERO_ROSTER } from "@/domain/heroRoster";

import { aMatch } from "../../test/builders";
import { mrvlFixture } from "../../test/fixtures";
import { toMatchStats } from "./align";
import { MrvlMatchPageSchema } from "./client";

const page = z
  .object({ value: MrvlMatchPageSchema })
  .parse(mrvlFixture("page-fly-100t.json")).value;
const stats = toMatchStats(
  aMatch({
    id: "kOKqgtPHq4_R2M1",
    bestOf: 5,
    startsAt: "2026-10-16T20:00:00.000Z",
    team1: { name: "FlyQuest", short: "FLY" },
    team2: { name: "100 Thieves", short: "100T" },
  }),
  page,
  "u1",
  new Date("2026-10-17T00:00:00Z"),
);

describe("recorded Ignite 2026 drafts", () => {
  it("follow the Ignite 2026 format step for step on every map", () => {
    expect(stats.maps.map((m) => formatDeviations(m.draft ?? [], IGNITE_2026))).toEqual([
      [],
      [],
      [],
      [],
    ]);
  });

  it("never let the other team play a banned hero, though the banning team often does", () => {
    expect(stats.maps.flatMap(bansBroken)).toEqual([]);
    const ownUse = stats.maps.flatMap((m) =>
      m.teams.flatMap((t) => {
        const own = new Set(t.players.flatMap((p) => p.heroes.map((h) => h.id)));
        return t.bans.filter((h) => own.has(h.id));
      }),
    );
    expect(ownUse.length).toBeGreaterThan(10);
  });

  it("count one team draft per side per map, with Gambit present on every map", () => {
    const summary = summariseDrafts(toTeamDrafts([stats]));
    expect(summary.sample).toEqual({ teamDrafts: 8, maps: 4, series: 1, withProtects: 8 });
    const gambit = summary.rows.find((r) => r.hero.id === "gambit");
    expect(gambit?.presentMaps).toBe(4);
  });
});

describe("draftCoverage on the recorded series", () => {
  it("reports every map ordered, following the format, with no ban broken", () => {
    expect(draftCoverage([stats], IGNITE_2026)).toEqual({
      series: 1,
      maps: 4,
      mapsWithOrder: 4,
      mapsFollowingFormat: 4,
      bans: 40,
      bansBroken: 0,
      oldestFetchedAt: "2026-10-17T00:00:00.000Z",
      newestFetchedAt: "2026-10-17T00:00:00.000Z",
    });
  });
});

describe("the simulator on recorded drafts", () => {
  it("accepts every recorded map's draft move for move and ends with the same bans", () => {
    for (const map of stats.maps) {
      let moves: SimMove[] = [];
      for (const a of map.draft ?? []) {
        const camp = a.camp === 0 ? 0 : 1;
        expect(moveProblem(IGNITE_2026, moves, camp, a.hero.id)).toBeNull();
        moves = applyMove(IGNITE_2026, moves, camp, a.hero.id);
      }
      expect(currentTurn(IGNITE_2026, moves)).toBeNull();
      const bySide = (side: 1 | 2) =>
        (map.draft ?? []).find((a) => a.side === side)?.camp === 0 ? 0 : 1;
      const [first, second] = outcome(moves);
      const sideOf = { 0: first, 1: second };
      expect(sideOf[bySide(1)].bans).toEqual(map.teams[0].bans.map((h) => h.id));
      expect(sideOf[bySide(2)].bans).toEqual(map.teams[1].bans.map((h) => h.id));
    }
  });
});

describe("HERO_ROSTER", () => {
  it("uses mrvl's id for every hero the recorded series played or banned", () => {
    const ids = new Set(HERO_ROSTER.map((h) => h.id));
    const seen = stats.maps.flatMap((m) =>
      m.teams.flatMap((t) => [...t.bans, ...t.players.flatMap((p) => p.heroes)]),
    );
    expect(seen.filter((h) => !ids.has(h.id)).map((h) => h.id)).toEqual([]);
  });
});
