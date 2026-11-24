import { describe, expect, it } from "vitest";

import {
  addHeroLines,
  combinePlayers,
  MatchStatsSchema,
  PlayerStatsSchema,
  type HeroLine,
  type PlayerStats,
  type TeamMapStats,
} from "./stats";

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

describe("a hero mrvl sent only as a placeholder", () => {
  const placeholder = (n: number) => ({
    id: `hero-${n}`,
    name: `Hero ${n}`,
    role: "Duelist",
    portraitUrl: "",
  });

  const usage = (n: number) => ({ ...placeholder(n), playSeconds: 120 });

  const stored = {
    matchId: "m1",
    source: "mrvl",
    sourceMatchId: "s1",
    sourceUpdatedAt: "1",
    fetchedAt: "2026-11-24T00:01:26.204Z",
    maps: [
      {
        index: 1,
        map: "Krakoa",
        durationSeconds: 600,
        draft: null,
        teams: ["A", "B"].map((name) => ({
          name,
          won: name === "A",
          score: 1,
          bans: [placeholder(1068), placeholder(1099)],
          players: [
            {
              name: `${name} one`,
              nationality: null,
              hero: placeholder(1068),
              heroes: [usage(1068), usage(1099)],
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
            },
          ],
        })),
      },
    ],
  };

  it("reads as Nightcrawler in a stored series, where mrvl's placeholder for him was kept", () => {
    const team = MatchStatsSchema.parse(stored).maps[0]?.teams[0];
    const player = team?.players[0];

    expect(team?.bans[0]).toMatchObject({ id: "nightcrawler", name: "Nightcrawler" });
    expect(player?.hero).toMatchObject({ id: "nightcrawler", role: "Strategist" });
    expect(player?.heroes[0]).toMatchObject({ id: "nightcrawler", playSeconds: 120 });
  });

  it("reads as a typed unknown, without failing the parse or showing its id", () => {
    const team = MatchStatsSchema.parse(stored).maps[0]?.teams[0];
    const unknowns = [team?.bans[1], team?.players[0]?.heroes[1]];

    expect(unknowns).toEqual([
      expect.objectContaining({ id: "hero-1099", name: "New hero", role: null, unknown: true }),
      expect.objectContaining({
        id: "hero-1099",
        name: "New hero",
        playSeconds: 120,
        unknown: true,
      }),
    ]);
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

describe("combinePlayers", () => {
  const line = (kills: number): HeroLine => ({
    kills,
    deaths: 0,
    assists: 0,
    finalHits: 0,
    damage: 0,
    damageTaken: 0,
    healing: 0,
    accuracy: 50,
  });

  const hero = (id: string, playSeconds: number, l: HeroLine | null) => ({
    id,
    name: id,
    role: null,
    portraitUrl: null,
    playSeconds,
    line: l,
  });

  const player = (heroes: PlayerStats["heroes"], kills: number, isMvp = false): PlayerStats => ({
    name: "Tonez",
    nationality: null,
    hero: null,
    heroes,
    kills,
    deaths: 0,
    assists: 0,
    finalHits: 0,
    damage: 0,
    damageTaken: 0,
    healing: 0,
    accuracy: null,
    isMvp,
    isSvp: false,
  });

  const team = (p: PlayerStats): TeamMapStats => ({
    name: "100T",
    won: true,
    score: 1,
    bans: [],
    players: [p],
  });

  it("adds a hero's time and line across maps, most played first, and counts MVPs", () => {
    const [row] = combinePlayers([
      team(player([hero("hulk", 100, line(3))], 3, true)),
      team(player([hero("hulk", 50, line(2)), hero("groot", 400, line(1))], 3)),
    ]);

    expect(row?.heroes.map((h) => [h.id, h.playSeconds, h.line?.kills])).toEqual([
      ["groot", 400, 1],
      ["hulk", 150, 5],
    ]);
    expect([row?.kills, row?.mvpCount]).toEqual([6, 1]);
  });

  it("leaves a hero's series line unknown when one map saved no line for it", () => {
    const [row] = combinePlayers([
      team(player([hero("hulk", 100, line(3))], 3)),
      team(player([hero("hulk", 50, null)], 2)),
    ]);

    expect(row?.heroes[0]?.line).toBeNull();
  });
});
