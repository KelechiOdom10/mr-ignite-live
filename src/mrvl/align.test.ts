import { describe, expect, it } from "vitest";
import { z } from "zod";

import { aMatch } from "../../test/builders";
import { mrvlFixture } from "../../test/fixtures";
import { findMrvlMatch, toMapOverrides, toMatchStats } from "./align";
import { MrvlMatchPageSchema, MrvlMatchSummarySchema, type MrvlMatchPage } from "./client";

const Summaries = z.object({ value: z.array(MrvlMatchSummarySchema) });
const page = z
  .object({ value: MrvlMatchPageSchema })
  .parse(mrvlFixture("page-fly-100t.json")).value;
const recent = Summaries.parse(mrvlFixture("recent.json")).value;
const live = Summaries.parse(mrvlFixture("live.json")).value;

const flyVs100t = aMatch({
  id: "kOKqgtPHq4_R2M1",
  bestOf: 5,
  startsAt: "2026-10-16T20:00:00.000Z",
  team1: { name: "FlyQuest", short: "FLY" },
  team2: { name: "100 Thieves", short: "100T" },
});

describe("findMrvlMatch", () => {
  it("links a Liquipedia series to mrvl by teams and start time", () => {
    expect(findMrvlMatch(flyVs100t, recent)?.id).toBe(page.match.id);
  });

  it("matches when Liquipedia's team names differ from mrvl's", () => {
    // mrvl calls Swamp Gaming "SWAMP".
    const tlcVsSwamp = aMatch({
      startsAt: "2026-10-16T22:00:00.000Z",
      team1: { name: "Liquid Citadel", short: "TLC" },
      team2: { name: "Swamp Gaming", short: "SG" },
    });
    expect(findMrvlMatch(tlcVsSwamp, live)?.teamTwoName).toMatch(/swamp/i);
  });

  it("ignores a same-teams series scheduled on another day", () => {
    const rematch = { ...flyVs100t, startsAt: "2026-10-20T20:00:00.000Z" };
    expect(findMrvlMatch(rematch, recent)).toBeNull();
  });

  it("does not link a series with a TBD side", () => {
    expect(findMrvlMatch({ ...flyVs100t, team2: null }, recent)).toBeNull();
  });
});

describe("toMatchStats on a recorded series", () => {
  const stats = toMatchStats(flyVs100t, page, "u1", new Date("2026-10-17T00:00:00Z"));

  it("keeps only played maps", () => {
    expect(stats.maps.map((m) => m.map)).toEqual([
      "God Quarry",
      "Midtown",
      "Heart of Heaven",
      "Spider-Islands",
    ]);
  });

  it("orders each map's teams as Liquipedia's team1, team2 even when mrvl lists them the other way", () => {
    // mrvl lists 100 Thieves first on map 1.
    const [first] = stats.maps;
    expect(first?.teams.map((t) => t.name)).toEqual(["FlyQuest", "100 Thieves"]);
    expect(first?.teams.map((t) => t.won)).toEqual([false, true]);
  });

  it("carries MVP and SVP per map", () => {
    const mvp = stats.maps[0]?.teams.flatMap((t) => t.players).find((p) => p.isMvp);
    const svp = stats.maps[0]?.teams.flatMap((t) => t.players).find((p) => p.isSvp);
    expect(mvp?.name).toBe("nectar");
    expect(svp?.name).toBe("Touzii");
  });

  it("keeps each side's own bans, including heroes both sides banned", () => {
    const [fly, thieves] = stats.maps[0]?.teams ?? [];
    expect(fly?.bans.map((h) => h.id)).toEqual([
      "devil-dinosaur",
      "emma-frost",
      "rogue",
      "groot",
      "psylocke",
    ]);
    expect(thieves?.bans.map((h) => h.id)).toContain("devil-dinosaur");
  });

  it("drops a map whose scoreboard names match neither Liquipedia team instead of guessing the order", () => {
    // Guessing mrvl's order would flip map 1's winner, since mrvl lists 100 Thieves first.
    const unnamed: MrvlMatchPage = {
      match: {
        ...page.match,
        games: page.match.games.map((game) => ({
          ...game,
          scoreboard: game.scoreboard && {
            ...game.scoreboard,
            teams: game.scoreboard.teams.map((team, i) => ({
              ...team,
              name: `Clan ${i}`,
              shortName: null,
              linkedTeamName: null,
            })),
          },
        })),
      },
    };
    const unaligned = toMatchStats(flyVs100t, unnamed, "u1", new Date("2026-10-17T00:00:00Z"));
    expect(unaligned.maps).toEqual([]);
    expect(toMapOverrides(unaligned)).toEqual([]);
  });

  it("turns map winners into score overrides in Liquipedia's orientation", () => {
    expect(toMapOverrides(stats).map((o) => [o.index, o.winner, o.score1, o.score2])).toEqual([
      [1, 2, 0, 2],
      [2, 1, 3, 0],
      [3, 1, 3, 2],
      [4, 1, 3, 0],
    ]);
  });
});
