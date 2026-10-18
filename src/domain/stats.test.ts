import { describe, expect, it } from "vitest";

import { addHeroLines, MatchStatsSchema, PlayerStatsSchema, type HeroLine } from "./stats";

describe("MatchStatsSchema", () => {
  it("still reads stats stored before draft order was kept, marking the draft as unknown", () => {
    const stored = {
      matchId: "m1",
      source: "mrvl",
      sourceMatchId: "s1",
      sourceUpdatedAt: "1",
      fetchedAt: "2026-10-16T23:30:35.341Z",
      maps: [
        {
          index: 1,
          map: "Krakoa",
          durationSeconds: 600,
          teams: [
            { name: "A", won: true, score: 1, bans: [], players: [] },
            { name: "B", won: false, score: 0, bans: [], players: [] },
          ],
        },
      ],
    };
    expect(MatchStatsSchema.parse(stored).maps[0]?.draft).toBeNull();
  });
});

describe("hero lines", () => {
  const line = (kills: number, accuracy: number | null): HeroLine => ({
    kills,
    deaths: 1,
    assists: 2,
    finalHits: 0,
    damage: 1000,
    damageTaken: 500,
    healing: 0,
    accuracy,
  });

  it("adds a hero's lines across maps but drops accuracy, which can't be summed from percentages", () => {
    expect(addHeroLines(line(3, 40), line(4, 60))).toEqual({
      ...line(7, null),
      deaths: 2,
      assists: 4,
      damage: 2000,
      damageTaken: 1000,
    });
  });

  it("makes the sum unknown when either map's line is missing, rather than counting it as zero", () => {
    expect(addHeroLines(line(3, 40), null)).toBeNull();
    expect(addHeroLines(undefined, line(3, 40))).toBeNull();
  });

  it("reads a player stored before per-hero lines were kept, with no line instead of zeros", () => {
    const stored = PlayerStatsSchema.parse({
      name: "Tonez",
      nationality: null,
      hero: null,
      heroes: [{ id: "hulk", name: "Hulk", role: null, portraitUrl: null, playSeconds: 250 }],
      kills: 13,
      deaths: 4,
      assists: 2,
      finalHits: 3,
      damage: 1,
      damageTaken: 1,
      healing: 0,
      accuracy: null,
      isMvp: false,
      isSvp: false,
    });
    expect(stored.heroes[0]?.line ?? null).toBeNull();
  });
});
