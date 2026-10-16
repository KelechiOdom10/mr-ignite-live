import { describe, expect, it } from "vitest";

import { matchState } from "@/domain/matchState";
import type { Match } from "@/domain/model";

import { aMap, aMatch } from "../../test/builders";
import { scoreToasts } from "./scoreToasts";

const NOW = Date.parse("2026-10-16T21:00:00.000Z");

function states(matches: Match[]) {
  return new Map(matches.map((m) => [m.id, matchState(m, NOW)]));
}

describe("scoreToasts", () => {
  const twoNil = aMatch({ bestOf: 5, maps: [aMap(1, 1), aMap(2, 1)] });

  it("doesn't name the series winner while spoilers are hidden, even with no new map", () => {
    // A bestOf correction (Bo5 → Bo3 at 2–0) finished the series without a new map and the
    // \"TLC win the series, 2–0\" toast skipped the Hide spoilers check.
    const corrected = { ...twoNil, bestOf: 3 };
    const toasts = scoreToasts([corrected], states([twoNil]), states([corrected]), true);
    expect(toasts.map((t) => `${t.title} ${t.description}`).join(" ")).not.toMatch(/win|2–0/);
  });

  it("announces the map winner and score when spoilers are shown", () => {
    const next = { ...twoNil, maps: [...twoNil.maps, aMap(3, 2)] };
    expect(scoreToasts([next], states([twoNil]), states([next]), false)).toEqual([
      { title: "SG take Map 3", description: "TLC 2–1 SG", status: "info", matchId: next.id },
    ]);
  });

  it("says only that the score changed when spoilers are hidden", () => {
    const next = { ...twoNil, maps: [...twoNil.maps, aMap(3, 2)] };
    expect(scoreToasts([next], states([twoNil]), states([next]), true)).toEqual([
      { title: "Score update", description: "TLC vs SG", status: "info", matchId: next.id },
    ]);
  });
});
