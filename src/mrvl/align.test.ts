import { describe, expect, it } from "vitest";
import { z } from "zod";

import { MatchStatsSchema } from "@/domain/stats";

import { aMatch } from "../../test/builders";
import { mrvlFixture } from "../../test/fixtures";
import { findMrvlMatch, toHeroLine, toMapOverrides, toMatchStats } from "./align";
import {
  MrvlMatchPageSchema,
  MrvlMatchSummarySchema,
  type MrvlMatchPage,
  type MrvlScoreboardTeam,
} from "./client";

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

  it("keeps each hero's own line, so Tonez's 13 kills split across the four heroes he played", () => {
    const tonez = stats.maps
      .flatMap((m) => m.teams.flatMap((t) => t.players))
      .find((p) => p.name === "Tonez" && p.heroes.length === 4);

    expect(tonez?.heroes.map((h) => [h.name, h.line?.kills])).toEqual([
      ["The Thing", 5],
      ["Hulk", 6],
      ["Peni Parker", 0],
      ["Groot", 2],
    ]);
    expect(tonez?.heroes.reduce((sum, h) => sum + (h.line?.kills ?? 0), 0)).toBe(tonez?.kills);
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

  it("drops a ban mrvl didn't capture instead of counting a hero called Hero 0", () => {
    const unrecorded = {
      kind: "ban",
      hero: { id: "hero-0", name: "Hero 0", role: "Duelist", portraitUrl: "" },
    };

    const withGap: MrvlMatchPage = {
      match: {
        ...page.match,
        games: page.match.games.map((game) => ({
          ...game,
          scoreboard: game.scoreboard && {
            ...game.scoreboard,
            teams: game.scoreboard.teams.map((team) => ({
              ...team,
              bans: [...(team.bans ?? []), unrecorded],
            })),
          },
        })),
      },
    };

    const map = toMatchStats(flyVs100t, withGap, "u1", new Date("2026-10-17T00:00:00Z")).maps[0];
    expect(map?.teams[0].bans.map((h) => h.id)).not.toContain("hero-0");
    expect(map?.teams[0].bans).toHaveLength(5);
  });

  it("keeps map 1's bans and protects in draft order, on Liquipedia's sides", () => {
    // 100 Thieves (side 2) is lobby camp 0, so it protects first; both sides ban in steps 0, 5 and 10.
    const steps = stats.maps[0]?.draft?.map((a) => [a.phase, a.side, a.kind, a.hero.id]);
    expect(steps).toEqual([
      [0, 1, "ban", "devil-dinosaur"],
      [0, 2, "ban", "gambit"],
      [1, 2, "protect", "gambit"],
      [2, 1, "ban", "emma-frost"],
      [3, 1, "protect", "loki"],
      [4, 2, "ban", "devil-dinosaur"],
      [5, 1, "ban", "rogue"],
      [5, 2, "ban", "wolverine"],
      [6, 1, "protect", "emma-frost"],
      [7, 2, "ban", "ultron"],
      [8, 2, "protect", "loki"],
      [9, 1, "ban", "groot"],
      [10, 1, "ban", "psylocke"],
      [10, 2, "ban", "elsa-bloodstone"],
    ]);
  });

  it("stores no draft when mrvl sends a map without a timeline, rather than an empty one", () => {
    const untimed: MrvlMatchPage = {
      match: {
        ...page.match,
        games: page.match.games.map((game) => ({
          ...game,
          scoreboard: game.scoreboard && {
            ...game.scoreboard,
            teams: game.scoreboard.teams.map((team) => ({ ...team, draftTimeline: null })),
          },
        })),
      },
    };

    const maps = toMatchStats(flyVs100t, untimed, "u1", new Date("2026-10-17T00:00:00Z")).maps;
    expect(maps.map((m) => m.draft)).toEqual([null, null, null, null]);
    expect(maps[0]?.teams[0].bans).toHaveLength(5);
  });

  function withTimelines(
    edit: (team: MrvlScoreboardTeam, i: number) => MrvlScoreboardTeam["draftTimeline"],
  ): MrvlMatchPage {
    return {
      match: {
        ...page.match,
        games: page.match.games.map((game) => ({
          ...game,
          scoreboard: game.scoreboard && {
            ...game.scoreboard,
            teams: game.scoreboard.teams.map((team, i) => ({
              ...team,
              draftTimeline: edit(team, i),
            })),
          },
        })),
      },
    };
  }

  it("stores no draft, but keeps the stats readable, when a step number isn't a whole step", () => {
    const odd = withTimelines((team) =>
      (team.draftTimeline ?? []).map((step, j) => (j === 0 ? { ...step, phaseIndex: -1 } : step)),
    );

    const parsed = MatchStatsSchema.safeParse(
      toMatchStats(flyVs100t, odd, "u1", new Date("2026-10-17T00:00:00Z")),
    );

    expect(parsed.success).toBe(true);
    expect(parsed.data?.maps.map((m) => m.draft)).toEqual([null, null, null, null]);
    expect(parsed.data?.maps[0]?.teams[0].bans).toHaveLength(5);
  });

  it("ignores the other team's steps if mrvl repeats them in a team's timeline", () => {
    const merged = withTimelines((team, i) => {
      const game = page.match.games.find((g) => g.scoreboard?.teams.includes(team));
      const other = game?.scoreboard?.teams[1 - i];

      return [...(team.draftTimeline ?? []), ...(other?.draftTimeline ?? [])];
    });

    const repeated = toMatchStats(flyVs100t, merged, "u1", new Date("2026-10-17T00:00:00Z"));
    expect(repeated.maps.map((m) => m.draft)).toEqual(stats.maps.map((m) => m.draft));
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

describe("toHeroLine", () => {
  it("drops a hero line with any count missing rather than showing the gap as zero", () => {
    expect(
      toHeroLine({ kills: 3, deaths: 1, assists: 2, finalHits: 1, damage: 10, damageTaken: 5 }),
    ).toBeNull();
    expect(toHeroLine(null)).toBeNull();
    expect(
      toHeroLine({
        kills: 3,
        deaths: 1,
        assists: 2,
        finalHits: 1,
        damage: 10,
        damageTaken: 5,
        healing: 0,
      }),
    ).toEqual({
      kills: 3,
      deaths: 1,
      assists: 2,
      finalHits: 1,
      damage: 10,
      damageTaken: 5,
      healing: 0,
      accuracy: null,
    });
  });
});
