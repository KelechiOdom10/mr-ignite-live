import { describe, expect, it } from "vitest";

import type { Hero } from "@/domain/stats";

import { filterHeroes, switchFormat, type SimSession } from "./simulatorState";

const hero = (id: string, name: string, role: Hero["role"]): Hero => ({
  id,
  name,
  role,
  portraitUrl: null,
});

const heroes = [
  hero("magneto", "Magneto", "Vanguard"),
  hero("hela", "Hela", "Duelist"),
  hero("mantis", "Mantis", "Strategist"),
  hero("loki", "Loki", null),
];

describe("filterHeroes", () => {
  it("narrows the pool to the chosen role, so Duelist doesn't leave every hero", () => {
    expect(filterHeroes(heroes, "Duelist", "").map((h) => h.id)).toEqual(["hela"]);
  });

  it("keeps every hero, including ones with no role, under All", () => {
    expect(filterHeroes(heroes, "All", "")).toHaveLength(4);
  });

  it("matches the search without case or surrounding space", () => {
    expect(filterHeroes(heroes, "All", "  HEL  ").map((h) => h.id)).toEqual(["hela"]);
  });
});

describe("switchFormat", () => {
  const played: SimSession = {
    formatId: "ignite-2026",
    moves: [{ step: 0, camp: 0, kind: "ban", heroId: "loki" }],
    camp: 1,
  };

  it("clears the moves and hands the first turn back when the format changes", () => {
    expect(switchFormat(played, "ranked")).toEqual({
      formatId: "ranked",
      moves: [],
      camp: 0,
    });
  });

  it("leaves the board alone when the chosen format is already showing", () => {
    expect(switchFormat(played, "ignite-2026")).toBeNull();
  });
});
