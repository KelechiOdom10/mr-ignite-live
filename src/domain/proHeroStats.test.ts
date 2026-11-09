import { describe, expect, it } from "vitest";

import {
  type HeroMatrixResponse,
  proHeroGroupFor,
  shownWinRate,
  toProHeroStats,
} from "./proHeroStats";

const WINDOW = { start: "2026-10-11", end: "2026-11-09", fetchedAt: "2026-11-09T20:00:00.000Z" };

function cell(overrides: Partial<HeroMatrixResponse["rows"][number]["cellsByHeroId"][string]>) {
  return {
    heroId: "gambit",
    heroName: "Gambit",
    playTimeSeconds: 300,
    totalAvailablePlayTimeSeconds: 600,
    heroGames: 12,
    banCount: 20,
    protectCount: 4,
    bannedAgainstCount: 20,
    protectedAgainstCount: 4,
    weightedWinRate: 0.55,
    ...overrides,
  };
}

function response(
  rows: HeroMatrixResponse["rows"],
  heroes: HeroMatrixResponse["heroes"] = [
    { heroId: "gambit", heroName: "Gambit", role: "Strategist", portraitUrl: null },
  ],
): HeroMatrixResponse {
  return { dimension: "map", metric: "pickRate", heroes, rows };
}

describe("toProHeroStats", () => {
  it("names a map by its label, because mrvl's group id can belong to another map", () => {
    const stats = toProHeroStats(
      response([
        {
          groupId: "god-quarry",
          groupLabel: "Thebes",
          eligibleGames: 40,
          gameCount: 20,
          cellsByHeroId: { gambit: cell({}) },
        },
        {
          groupId: "god-quarry-domination",
          groupLabel: "God Quarry",
          eligibleGames: 20,
          gameCount: 10,
          cellsByHeroId: { gambit: cell({}) },
        },
      ]),
      WINDOW,
    );

    expect(stats.groups.map((g) => g.map)).toEqual(["thebes", "god quarry"]);
  });

  it("derives ban and protect rates from eligible team-games, not games", () => {
    const stats = toProHeroStats(
      response([
        {
          groupId: "overall",
          groupLabel: "Overall",
          isOverall: true,
          eligibleGames: 40,
          gameCount: 20,
          cellsByHeroId: { gambit: cell({ banCount: 10, protectCount: 6 }) },
        },
      ]),
      WINDOW,
    );

    expect(stats.groups[0]?.heroes[0]).toMatchObject({ banRate: 0.25, protectRate: 0.15 });
  });

  it("leaves pick rate unknown when the hero was never available", () => {
    const stats = toProHeroStats(
      response([
        {
          groupId: "overall",
          groupLabel: "Overall",
          isOverall: true,
          eligibleGames: 2,
          gameCount: 1,
          cellsByHeroId: {
            gambit: cell({ playTimeSeconds: 0, totalAvailablePlayTimeSeconds: 0 }),
          },
        },
      ]),
      WINDOW,
    );

    expect(stats.groups[0]?.heroes[0]?.pickRate).toBeNull();
  });

  it("orders heroes by games played before pick rate", () => {
    const stats = toProHeroStats(
      response(
        [
          {
            groupId: "overall",
            groupLabel: "Overall",
            isOverall: true,
            eligibleGames: 20,
            gameCount: 10,
            cellsByHeroId: {
              gambit: cell({
                heroGames: 5,
                playTimeSeconds: 540,
                totalAvailablePlayTimeSeconds: 600,
              }),
              loki: cell({
                heroId: "loki",
                heroName: "Loki",
                heroGames: 9,
                playTimeSeconds: 60,
                totalAvailablePlayTimeSeconds: 600,
              }),
            },
          },
        ],
        [
          { heroId: "gambit", heroName: "Gambit", role: "Strategist", portraitUrl: null },
          { heroId: "loki", heroName: "Loki", role: "Strategist", portraitUrl: null },
        ],
      ),
      WINDOW,
    );

    expect(stats.groups[0]?.heroes.map((h) => h.id)).toEqual(["loki", "gambit"]);
  });
});

describe("shownWinRate", () => {
  const hero = (games: number) => ({
    id: "gambit",
    name: "Gambit",
    role: "Strategist",
    portraitUrl: null,
    games,
    pickRate: 0.5,
    banRate: 0.5,
    protectRate: 0.1,
    winRate: 0.55,
  });

  it("hides a win rate below ten games, where the sample is too small to read", () => {
    expect(shownWinRate(hero(9))).toBeNull();
  });

  it("shows the win rate from ten games", () => {
    expect(shownWinRate(hero(10))).toBe(0.55);
  });
});

describe("proHeroGroupFor", () => {
  const groups = toProHeroStats(
    response([
      {
        groupId: "overall",
        groupLabel: "Overall",
        isOverall: true,
        eligibleGames: 20,
        gameCount: 10,
        cellsByHeroId: { gambit: cell({}) },
      },
      {
        groupId: "yggdrasill-path",
        groupLabel: "Yggdrasill Path",
        eligibleGames: 4,
        gameCount: 2,
        cellsByHeroId: { gambit: cell({}) },
      },
    ]),
    WINDOW,
  ).groups;

  it("resolves a long Liquipedia map name to the same map group", () => {
    expect(proHeroGroupFor(groups, "Yggsgard: Yggdrasill Path")?.map).toBe("yggdrasill path");
  });

  it("returns the Overall group when no map is filtered", () => {
    expect(proHeroGroupFor(groups, null)?.map).toBe("overall");
  });

  it("returns nothing rather than another map when the filtered map has no group", () => {
    expect(proHeroGroupFor(groups, "Arakko")).toBeNull();
  });
});
