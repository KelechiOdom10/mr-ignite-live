import { describe, expect, it } from "vitest";

import { aMap, aMatch } from "../../test/builders";
import type { Match, PrizePlacement, Team } from "./model";
import { bracketPlacings, fillPlacings } from "./prizePlacings";

const NOW = Date.parse("2026-11-09T00:00:00.000Z");
const A: Team = { name: "Alpha", short: "ALP" };
const B: Team = { name: "Bravo", short: "BRV" };
const C: Team = { name: "Charlie", short: "CHR" };
const D: Team = { name: "Delta", short: "DLT" };

function aWin(id: string, round: string, side: 1 | 2, team1: Team, team2: Team): Match {
  return aMatch({
    id: `bracket_${id}`,
    round,
    team1,
    team2,
    maps: [aMap(1, side), aMap(2, side), aMap(3, side)],
  });
}

function aBracket(): Match[] {
  return [
    aWin("R1M1", "Upper Bracket Semifinals", 1, A, B),
    aWin("R1M2", "Upper Bracket Semifinals", 1, C, D),
    aWin("R2M1", "Lower Bracket Round 1", 1, B, D),
    aWin("R2M2", "Upper Bracket Final", 1, A, C),
    aWin("R3M1", "Lower Bracket Final", 1, C, B),
    aWin("R4M1", "Grand Final", 1, A, C),
  ];
}

function aPrize(place: number, count: number, prizeUsd = 100): PrizePlacement {
  return { place, prizeUsd, count, team: null };
}

describe("bracketPlacings", () => {
  it("orders a finished double-elimination bracket, best place first", () => {
    expect(
      bracketPlacings(aBracket(), NOW)?.map((group) => group.map((team) => team.name)),
    ).toEqual([["Alpha"], ["Charlie"], ["Bravo"], ["Delta"]]);
  });

  it("returns nothing until every playoff match has a winner", () => {
    const bracket = aBracket().map((match) =>
      match.id === "bracket_R4M1" ? { ...match, maps: [] } : match,
    );

    expect(bracketPlacings(bracket, NOW)).toBeNull();
  });

  it("returns nothing when a round name doesn't say upper, lower or grand final", () => {
    const bracket = aBracket().map((match) =>
      match.id === "bracket_R2M1" ? { ...match, round: "Round 2" } : match,
    );

    expect(bracketPlacings(bracket, NOW)).toBeNull();
  });

  it("returns nothing when playoff matches come from more than one bracket", () => {
    const bracket = aBracket().map((match) =>
      match.id === "bracket_R4M1" ? { ...match, id: "other_R4M1" } : match,
    );

    expect(bracketPlacings(bracket, NOW)).toBeNull();
  });

  it("returns nothing when a playoff team is left without a group", () => {
    const bracket = aBracket().filter((match) => match.id !== "bracket_R2M1");

    expect(bracketPlacings(bracket, NOW)).toBeNull();
  });
});

describe("fillPlacings", () => {
  const prizes = [aPrize(1, 1), aPrize(2, 2), aPrize(3, 2), aPrize(4, 1)];

  it("fills slots in order while each group matches its slot's size", () => {
    const { prizes: filled, derived } = fillPlacings(prizes, [[A], [B, C]]);

    expect(derived).toBe(true);
    expect(filled.map((prize) => prize.team?.name ?? null)).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
      null,
    ]);
  });

  it("stops at the first slot whose size the next group doesn't match", () => {
    const { prizes: filled, derived } = fillPlacings(prizes, [[A], [B], [C, D]]);

    expect(derived).toBe(true);
    expect(filled.map((prize) => prize.team?.name ?? null)).toEqual(["Alpha", null, null, null]);
  });

  it("leaves a named team in place and still fills the slots after it", () => {
    const named = [{ ...aPrize(1, 1), team: A }, aPrize(2, 1)];
    const { prizes: filled, derived } = fillPlacings(named, [[B], [C]]);

    expect(derived).toBe(true);
    expect(filled.map((prize) => prize.team?.name ?? null)).toEqual(["Alpha", "Charlie"]);
  });

  it("changes nothing when the bracket offers no groups", () => {
    expect(fillPlacings(prizes, [])).toEqual({ prizes, derived: false });
  });

  it("changes nothing when the first group already doesn't fit", () => {
    const single = [aPrize(1, 1)];

    expect(fillPlacings(single, [[A, B]])).toEqual({ prizes: single, derived: false });
  });
});
