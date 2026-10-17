import { describe, expect, it } from "vitest";

import { aMap, aMatch } from "../../test/builders";
import { matchState } from "./matchState";
import { bracketFeeders, formView, matchView } from "./matchView";
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

describe("bracketFeeders", () => {
  const team = (short: string) => ({ name: short, short });
  const at = (hour: number) => `2026-10-16T${String(hour).padStart(2, "0")}:00:00.000Z`;
  const won = (winner: 1 | 2) => [aMap(1, winner), aMap(2, winner), aMap(3, winner)];
  const semi1 = aMatch({
    id: "kOK_R2M1",
    round: "Upper Bracket Semifinals",
    startsAt: at(10),
    team1: team("FLY"),
    team2: team("100T"),
    maps: won(1),
  });
  const semi2 = aMatch({
    id: "kOK_R2M2",
    round: "Upper Bracket Semifinals",
    startsAt: at(12),
    team1: team("TLC"),
    team2: team("SG"),
    maps: won(1),
  });
  const upperFinal = aMatch({
    id: "kOK_R4M1",
    round: "Upper Bracket Final",
    startsAt: at(20),
    team1: team("FLY"),
    team2: team("TLC"),
  });
  const lowerQuarter = aMatch({
    id: "kOK_R2M3",
    round: "Lower Bracket Quarterfinals",
    startsAt: at(22),
    team1: team("SG"),
    team2: null,
  });
  const bracket = [semi1, semi2, upperFinal, lowerQuarter];
  const hiddenView = (m: Match) =>
    matchView(m, matchState(m, NOW), true, bracketFeeders(bracket, NOW).get(m.id));

  it("doesn't name the semifinal winners in a hidden upper final", () => {
    const v = hiddenView(upperFinal);
    expect([v.side1.team, v.side2.team]).toEqual([null, null]);
    expect([v.side1.name, v.side1.short]).toEqual([
      "Winner of Upper Bracket Semifinals",
      "Winner of UB Semifinals",
    ]);
    expect(v.summary).not.toMatch(/FLY|TLC/);
  });

  it("names a dropped team as the loser of its upper-bracket round, though ids share a round number", () => {
    expect(hiddenView(lowerQuarter).side1.name).toBe("Loser of Upper Bracket Semifinals");
    expect(hiddenView(lowerQuarter).side2.name).toBe("TBD");
  });

  it("keeps first-round teams, which came from outside the bracket", () => {
    expect([hiddenView(semi1).side1.short, hiddenView(semi1).side2.short]).toEqual(["FLY", "100T"]);
  });

  it("orders by round when start times are missing", () => {
    const undated = bracket.map((m) => ({ ...m, startsAt: null }));
    const feeders = bracketFeeders(undated, NOW).get("kOK_R4M1");
    expect(feeders?.[1]).toEqual({ result: "Winner", round: "Upper Bracket Semifinals" });
  });

  it("ignores another bracket's results for the same team", () => {
    const otherEvent = { ...semi1, id: "other_R1M1", eventId: "MR Ignite/2026/Stage 2/EMEA" };
    expect(bracketFeeders([otherEvent, semi1], NOW).has(semi1.id)).toBe(false);
  });

  it("names the teams when spoilers are shown", () => {
    const v = matchView(
      upperFinal,
      matchState(upperFinal, NOW),
      false,
      bracketFeeders(bracket, NOW).get(upperFinal.id),
    );
    expect([v.side1.short, v.side2.short]).toEqual(["FLY", "TLC"]);
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
