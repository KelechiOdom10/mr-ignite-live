import { describe, expect, it } from "vitest";

import { aMap, aMatch } from "../../test/builders";
import { matchState } from "./matchState";
import { formView, matchView } from "./matchView";
import type { Match } from "./model";

const NOW = Date.parse("2026-10-16T23:00:00.000Z");

function view(match: Match, hidden: boolean) {
  return matchView(match, matchState(match, NOW), hidden);
}

const sweep = aMatch({ maps: [aMap(1, 1), aMap(2, 1), aMap(3, 1)] });
const fullDistance = aMatch({
  maps: [aMap(1, 1), aMap(2, 2), aMap(3, 1), aMap(4, 2), aMap(5, 1)],
});

describe("matchView with spoilers hidden", () => {
  it("shows a hidden Bo5 that ended 3-0 with the same five neutral map slots as one that went to five", () => {
    expect(view(sweep, true).maps).toEqual(view(fullDistance, true).maps);
    expect(view(sweep, true).maps).toEqual(
      [1, 2, 3, 4, 5].map((index) => ({ kind: "hidden", index })),
    );
  });

  it("gives no score, winner or dimmed loser for a finished series", () => {
    const v = view(sweep, true);
    expect(v.winner).toBeNull();
    expect([v.side1, v.side2].map((s) => [s.score, s.outcome])).toEqual([
      [null, "open"],
      [null, "open"],
    ]);
    expect(v.summary).toBe("Liquid Citadel vs Swamp Gaming, Upper Bracket Quarterfinals");
  });

  it("doesn't mark the in-progress map of a live series, which would count the maps played", () => {
    const live = aMatch({ maps: [aMap(1, 1), aMap(2, 2)] });
    expect(view(live, true).maps.every((m) => m.kind === "hidden")).toBe(true);
  });

  it("offers one VOD from the first map instead of one per played map", () => {
    const withVods = {
      ...sweep,
      maps: sweep.maps.map((m) => ({ ...m, vod: `https://vod.example/${m.index}` })),
    };
    expect(view(withVods, true).vods).toEqual([
      { index: 1, url: "https://vod.example/1", label: "Watch from map 1" },
    ]);
  });

  it("drops a lone VOD for map 4 of a Bo5, which would reveal the series went at least four", () => {
    const lateVod = {
      ...fullDistance,
      maps: fullDistance.maps.map((m) => ({
        ...m,
        vod: m.index === 4 ? "https://vod.example/4" : null,
      })),
    };
    expect(view(lateVod, true).vods).toEqual([]);
  });

  it("hides a team's recent W/L form", () => {
    expect(formView({ name: "Liquid Citadel", short: "TLC" }, [sweep], NOW, true)).toEqual({
      kind: "hidden",
    });
  });
});

describe("matchView with spoilers shown", () => {
  it("names the winner, dims the loser and scores each side", () => {
    const v = view(sweep, false);
    expect(v.winner).toBe(1);
    expect([v.side1.outcome, v.side2.outcome]).toEqual(["won", "lost"]);
    expect([v.side1.score, v.side2.score]).toEqual([3, 0]);
    expect(v.summary).toBe("Liquid Citadel 3, Swamp Gaming 0, final, Upper Bracket Quarterfinals");
  });

  it("marks the next map of a live series as current and leaves later maps open", () => {
    const live = aMatch({ maps: [aMap(1, 1), aMap(2, 2)] });
    expect(view(live, false).maps.map((m) => m.kind)).toEqual([
      "played",
      "played",
      "current",
      "open",
      "open",
    ]);
  });

  it("reads map scores from the winner's side", () => {
    const m = aMatch({ maps: [{ ...aMap(1, 2), score1: 1, score2: 3 }] });
    expect(view(m, false).maps[0]).toMatchObject({ winner: 2, winnerScore: 3, loserScore: 1 });
  });

  it("doesn't score an upcoming match as 0-0", () => {
    const upcoming = aMatch({ startsAt: "2026-10-17T20:00:00.000Z" });
    expect([view(upcoming, false).side1.score, view(upcoming, false).statusText]).toEqual([
      null,
      null,
    ]);
  });
});
