import { describe, expect, it } from "vitest";

import { groupTables } from "@/domain/standings";
import { parseGroups, parsePageMatches } from "@/liquipedia/parse";

import { recordedWikitext } from "../../test/fixtures";

const TITLE = "MR Ignite/2026/Grand Finals/Group Stage";
const NOW = Date.parse("2026-11-23T19:55:00Z");

function recorded() {
  const text = recordedWikitext(TITLE, "grand-finals-matches.json");

  return { groups: parseGroups(TITLE, text), matches: parsePageMatches(TITLE, text) };
}

function rows(table: ReturnType<typeof groupTables>[number]) {
  return table.rows.map((r) => [
    r.place,
    r.team.name,
    `${r.seriesWins}-${r.seriesLosses}`,
    `${r.mapWins}-${r.mapLosses}`,
    r.mapDiff,
  ]);
}

describe("groupTables on the recorded Grand Finals group stage", () => {
  const { groups, matches } = recorded();
  const [a, b] = groupTables(groups, matches, NOW);

  it("matches Liquipedia's table on day 1: Natus Vincere and Swamp Gaming level on top", () => {
    expect(a && rows(a)).toEqual([
      [1, "Natus Vincere", "1-0", "2-0", 2],
      [1, "Swamp Gaming", "1-0", "2-0", 2],
      [3, "FlyQuest", "1-1", "2-3", -1],
      [4, "Gen.G Esports", "1-1", "3-2", 1],
      [5, "Aconyx", "0-1", "0-2", -2],
      [5, "aimerz Esports", "0-1", "0-2", -2],
    ]);

    expect(b && rows(b)).toEqual([
      [1, "Liquid Citadel", "2-0", "4-0", 4],
      [2, "100 Thieves", "1-0", "2-0", 2],
      [2, "RAD", "1-0", "2-0", 2],
      [4, "Virtus.pro", "1-1", "2-2", 0],
      [5, "Monarch", "0-2", "0-4", -4],
      [5, "REJECT", "0-2", "0-4", -4],
    ]);
  });

  it("puts FlyQuest above Gen.G on head-to-head even though Gen.G has the better map record", () => {
    const names = a?.rows.map((r) => r.team.name) ?? [];
    expect(names.indexOf("FlyQuest")).toBeLessThan(names.indexOf("Gen.G Esports"));
  });

  it("leaves a series in progress out of the table and marks both teams as live", () => {
    const swamp = a?.rows.find((r) => r.team.name === "Swamp Gaming");
    const aconyx = a?.rows.find((r) => r.team.name === "Aconyx");
    expect([swamp?.live, aconyx?.live]).toEqual([true, true]);
    expect(aconyx?.seriesWins).toBe(0);
    expect(a?.rows.filter((r) => r.live)).toHaveLength(2);
  });

  it("names the day the tied teams meet", () => {
    const top = a?.rows[0];
    expect(top?.tiedWith).toEqual(["Swamp Gaming"]);
    expect(top?.tiebreakRound).toBe("Day 3");
  });

  it("marks no team through or out this early, since every team can still finish anywhere", () => {
    expect([...(a?.rows ?? []), ...(b?.rows ?? [])].map((r) => r.status)).toEqual(
      Array(12).fill(null),
    );
  });

  it("marks no team three days on, when the display timeout has closed every unplayed series", () => {
    const later = groupTables(groups, matches, Date.parse("2026-11-26T03:00:00Z"));

    expect(later.flatMap((t) => t.rows.map((r) => r.status))).toEqual(Array(12).fill(null));
  });

  it("keeps the two groups apart", () => {
    expect(a?.rows.map((r) => r.team.name)).not.toContain("RAD");
    expect(b?.rows.map((r) => r.team.name)).not.toContain("FlyQuest");
  });
});
