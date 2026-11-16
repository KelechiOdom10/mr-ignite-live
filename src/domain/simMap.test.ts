import { describe, expect, it } from "vitest";

import type { ProHeroStat, ProHeroStats } from "./proHeroStats";
import { parseSimMap, simMapOptions, simMapRates, simMapTiles } from "./simMap";

function hero(overrides: Partial<ProHeroStat> & { id: string; games: number }): ProHeroStat {
  return {
    name: overrides.id,
    role: "Strategist",
    portraitUrl: null,
    pickRate: 0.5,
    banRate: 0.25,
    protectRate: 0.1,
    winRate: 0.55,
    ...overrides,
  };
}

const STATS: ProHeroStats = {
  window: { start: "2026-10-11", end: "2026-11-09" },
  fetchedAt: "2026-11-09T20:00:00.000Z",
  groups: [
    {
      map: "overall",
      games: 157,
      heroes: [hero({ id: "gambit", games: 40 })],
    },
    {
      map: "yggdrasill path",
      games: 15,
      heroes: [
        hero({ id: "gambit", games: 8, winRate: 0.6 }),
        hero({ id: "loki", games: 12, winRate: 0.35 }),
      ],
    },
    {
      map: "god quarry",
      games: 11,
      heroes: [hero({ id: "gambit", games: 11 })],
    },
  ],
};

describe("parseSimMap", () => {
  const maps = simMapOptions(STATS);

  it("keeps a map the matrix has a group for", () => {
    expect(parseSimMap("yggdrasill path", maps)).toBe("yggdrasill path");
  });

  it("resolves a shared long map name to the group it belongs to", () => {
    expect(parseSimMap("Yggsgard: Yggdrasill Path", maps)).toBe("yggdrasill path");
  });

  it("falls back to All maps when the value is missing, blank or unknown", () => {
    expect(parseSimMap(undefined, maps)).toBeNull();
    expect(parseSimMap(null, maps)).toBeNull();
    expect(parseSimMap("  ", maps)).toBeNull();
    expect(parseSimMap("brand new map", maps)).toBeNull();
  });

  it("falls back to All maps for a known map the matrix has no group for", () => {
    expect(parseSimMap("Krakoa", maps)).toBeNull();
  });
});

describe("simMapOptions", () => {
  it("offers every map group in name order, without Overall as a map", () => {
    expect(simMapOptions(STATS)).toEqual(["god quarry", "yggdrasill path"]);
  });

  it("offers nothing when the matrix is missing, so the picker is disabled", () => {
    expect(simMapOptions(null)).toEqual([]);
  });
});

describe("simMapRates", () => {
  it("uses the Overall group when the link names no map", () => {
    const matrix = simMapRates(STATS, null);

    expect(matrix?.group.map).toBe("overall");
    expect(matrix?.group.games).toBe(157);
    expect(matrix?.rates.gambit?.banned).toBe(0.25);
  });

  it("uses the chosen map's group, not Overall", () => {
    const matrix = simMapRates(STATS, "yggdrasill path");

    expect(matrix?.group.games).toBe(15);
    expect(matrix?.rates.loki).toMatchObject({ pick: 0.5, banned: 0.25, protected: 0.1 });
  });

  it("hides a map group's win rate below ten games but shows it from ten", () => {
    const rates = simMapRates(STATS, "yggdrasill path")?.rates;

    expect(rates?.gambit?.win).toBeNull();
    expect(rates?.loki?.win).toBe(0.35);
  });

  it("returns nothing when the matrix is missing, so the page keeps its synced-series rates", () => {
    expect(simMapRates(null, null)).toBeNull();
    expect(simMapRates(null, "yggdrasill path")).toBeNull();
  });
});

describe("simMapTiles", () => {
  it("gives each map the catalogue's art and mode", () => {
    expect(simMapTiles(["god quarry"])).toEqual([
      {
        name: "god quarry",
        label: "God Quarry",
        mode: "Domination",
        imageUrl: "https://www.mrvl.net/images/maps/god-quarry.png",
      },
    ]);
  });

  it("keeps a map the catalogue lacks as a plain tile rather than guessing a URL", () => {
    expect(simMapTiles(["brand new map"])).toEqual([
      { name: "brand new map", label: "Brand New Map", mode: null, imageUrl: null },
    ]);
  });
});
