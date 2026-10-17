import { describe, expect, it } from "vitest";

import { aMap, aMatch } from "../../test/builders";
import { matchState } from "./matchState";
import { formView, matchTitle, matchView } from "./matchView";
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

describe("matchView in a hidden bracket", () => {
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
  const viewIn = (m: Match, matches: Match[], hidden = true) =>
    matchView(m, matchState(m, NOW), hidden, { matches, now: NOW });

  it("doesn't name the semifinal winners in a hidden upper final", () => {
    const v = viewIn(upperFinal, bracket);
    expect([v.side1.team, v.side2.team]).toEqual([null, null]);
    expect([v.side1.name, v.side1.short]).toEqual([
      "Winner of Upper Bracket Semifinals",
      "Winner of UB Semifinals",
    ]);
    expect(v.summary).not.toMatch(/FLY|TLC/);
  });

  it("doesn't name the semifinal winners in a hidden upper-final page title", () => {
    expect(matchTitle(viewIn(upperFinal, bracket))).toBe(
      "Winner of UB Semifinals vs Winner of UB Semifinals",
    );
    expect(matchTitle(viewIn(upperFinal, bracket, false))).toBe("FLY vs TLC");
  });

  it("names a dropped team as the loser of its upper-bracket round, though ids share a round number", () => {
    expect(viewIn(lowerQuarter, bracket).side1.name).toBe("Loser of Upper Bracket Semifinals");
    expect(viewIn(lowerQuarter, bracket).side2.name).toBe("TBD");
  });

  it("keeps first-round teams, which came from outside the bracket", () => {
    const v = viewIn(semi1, bracket);
    expect([v.side1.short, v.side2.short]).toEqual(["FLY", "100T"]);
  });

  it("labels a feeder with no recorded winner like a decided one, so a hidden walkover doesn't stand out", () => {
    const walkoverSemi = { ...semi1, maps: [], markedFinished: true };
    const v = viewIn(upperFinal, [walkoverSemi, semi2, upperFinal]);
    expect([v.side1.name, v.side1.short]).toEqual([
      "Winner of Upper Bracket Semifinals",
      "Winner of UB Semifinals",
    ]);
    const walkoverSemi2 = { ...semi2, maps: [], markedFinished: true };
    expect(viewIn(lowerQuarter, [semi1, walkoverSemi2, lowerQuarter]).side1.name).toBe(
      "Loser of Upper Bracket Semifinals",
    );
  });

  it("orders by round when start times are missing", () => {
    const undated = bracket.map((m) => ({ ...m, startsAt: null }));
    const final = undated.find((m) => m.id === upperFinal.id) ?? upperFinal;
    expect(viewIn(final, undated).side1.name).toBe("Winner of Upper Bracket Semifinals");
  });

  it("ignores another bracket's results for the same team", () => {
    const otherEvent = { ...semi1, id: "other_R1M1", eventId: "MR Ignite/2026/Stage 2/EMEA" };
    expect(viewIn(semi1, [otherEvent, semi1]).side1.short).toBe("FLY");
  });

  it("doesn't relabel group-stage teams by their earlier group results", () => {
    const group = (id: string, hour: number, maps: Match["maps"]) =>
      aMatch({ id, phase: "Group Stage", round: "Week 1", startsAt: at(hour), maps });
    const second = group("grp_0002", 12, []);
    expect(viewIn(second, [group("grp_0001", 10, won(1)), second]).side1.short).toBe("TLC");
  });

  it("names the teams when spoilers are shown", () => {
    const v = viewIn(upperFinal, bracket, false);
    expect([v.side1.short, v.side2.short]).toEqual(["FLY", "TLC"]);
  });
});

describe("matchView for series that ended without a winner", () => {
  const AFTER_WINDOW = Date.parse("2026-10-17T03:00:00.000Z");

  it("calls a finished series with no maps a walkover instead of '0 - 0 Final'", () => {
    const walkover = aMatch({ markedFinished: true });
    const v = matchView(walkover, matchState(walkover, NOW), false);
    expect([v.statusText, v.side1.score, v.side2.score]).toEqual(["Walkover", null, null]);
    expect(v.summary).toBe("Liquid Citadel vs Swamp Gaming, walkover, Upper Bracket Quarterfinals");
  });

  it("says 'No result' for a series closed by the 6h abandoned rule", () => {
    const abandoned = aMatch();
    const v = matchView(abandoned, matchState(abandoned, AFTER_WINDOW), false);
    expect([v.statusText, v.side1.score, v.winner]).toEqual(["No result", null, null]);
  });

  it("keeps the partial score of an abandoned series that got through a map", () => {
    const partial = aMatch({ maps: [aMap(1, 2)] });
    const v = matchView(partial, matchState(partial, AFTER_WINDOW), false);
    expect([v.statusText, v.side1.score, v.side2.score]).toEqual(["No result", 0, 1]);
  });

  it("still scores a live series 0-0 before its first map", () => {
    expect(view(aMatch(), false).side1.score).toBe(0);
  });

  it("says only 'Final' for a hidden walkover, which would reveal a forfeit", () => {
    const walkover = aMatch({ markedFinished: true });
    expect(matchView(walkover, matchState(walkover, NOW), true).statusText).toBe("Final");
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
