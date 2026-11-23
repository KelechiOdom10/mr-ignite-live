import { describe, expect, it } from "vitest";

import { type Group, type MapWinner, type Match } from "./model";
import { GROUP_STAGE, groupTables } from "./standings";

const TIEBREAKERS = ["matchwins", "matchlosses", "h2hlegacy.matchwins", "gamediff"];
const NOON = Date.parse("2026-11-23T10:30:00Z");
const NEXT_DAY = Date.parse("2026-11-24T10:30:00Z");

const team = (name: string) => ({ name, short: name });

function aGroup(overrides: Partial<Group> = {}): Group {
  return {
    eventId: "e",
    title: "Group X",
    matchGroups: ["list"],
    advance: 2,
    teams: ["A", "B", "C", "D"],
    tiebreakers: TIEBREAKERS,
    ...overrides,
  };
}

function series(
  n: number,
  t1: string | null,
  t2: string | null,
  winner: 0 | 1 | 2,
  extra: Partial<Match> & { played?: MapWinner[] } = {},
): Match {
  const { played = winner === 0 ? [] : [winner, winner], ...rest } = extra;

  return {
    id: `list_M${n}`,
    eventId: "e",
    phase: GROUP_STAGE,
    round: "Day 1",
    bestOf: 3,
    startsAt: "2026-11-23T10:00:00.000Z",
    team1: t1 ? team(t1) : null,
    team2: t2 ? team(t2) : null,
    maps: played.map((w, i) => ({
      index: i + 1,
      map: "",
      score1: null,
      score2: null,
      winner: w,
      vod: null,
    })),
    markedFinished: false,
    twitch: null,
    youtube: null,
    ...rest,
  };
}

const played4 = [
  series(1, "A", "B", 1),
  series(2, "A", "C", 1),
  series(3, "A", "D", 1),
  series(4, "B", "C", 1),
];

function statuses(matches: Match[], group = aGroup(), now = NOON) {
  const table = groupTables([group], matches, now)[0];

  return Object.fromEntries((table?.rows ?? []).map((r) => [r.team.name, r.status]));
}

describe("groupTables certainty", () => {
  it("marks a team through only once no result left can drop it below the cutoff", () => {
    expect(statuses([...played4, series(5, "B", "D", 1), series(6, "C", "D", 1)])).toEqual({
      A: "through",
      B: "through",
      C: "out",
      D: "out",
    });
  });

  it("marks a team out only once it can no longer reach the cutoff, not before", () => {
    expect(statuses([...played4, series(5, "B", "D", 0), series(6, "C", "D", 0)])).toEqual({
      A: "through",
      B: null,
      C: null,
      D: null,
    });
  });

  it("settles the cutoff on map difference once every series is played, though the teams are level on series", () => {
    const finished = [
      ...played4,
      series(5, "D", "B", 1, { played: [2, 1, 1] }),
      series(6, "C", "D", 1),
    ];

    expect(statuses(finished)).toEqual({ A: "through", B: "through", C: "out", D: "out" });
  });

  it("leaves teams level on every tiebreaker across the cutoff unmarked after the last series", () => {
    const level = [
      series(1, "A", "B", 1),
      series(2, "A", "C", 1),
      series(3, "A", "D", 1),
      series(4, "B", "C", 1),
      series(5, "C", "D", 1),
      series(6, "D", "B", 1),
    ];

    expect(statuses(level)).toEqual({ A: "through", B: null, C: null, D: null });
  });

  it("does not let the card timeout stand in for a result: a series nobody played is still open", () => {
    const stalled = [...played4, series(5, "B", "D", 0), series(6, "C", "D", 0)];

    expect(statuses(stalled, aGroup(), NEXT_DAY)).toEqual({
      A: "through",
      B: null,
      C: null,
      D: null,
    });
  });

  it("counts a walkover only when the page names who it was awarded to", () => {
    const awarded = (winner?: 1 | 2) => [
      ...played4,
      series(5, "B", "D", 0, { markedFinished: true, awarded: winner }),
      series(6, "C", "D", 1),
    ];

    expect(statuses(awarded(1))).toEqual({ A: "through", B: "through", C: "out", D: "out" });
    expect(statuses(awarded())).toEqual({ A: "through", B: null, C: null, D: null });
  });

  it("marks nobody while a fixture still has a side to be decided", () => {
    const tbd = [...played4, series(5, "B", "D", 1), series(6, "C", null, 0)];

    expect(statuses(tbd)).toEqual({ A: null, B: null, C: null, D: null });
  });

  it("marks nobody while a series between two roster teams is missing", () => {
    expect(statuses([...played4, series(5, "B", "D", 1)])).toEqual({
      A: null,
      B: null,
      C: null,
      D: null,
    });
  });

  it("reads a team the page spells in another case as the same team", () => {
    const respelled = [
      series(1, "A", "B", 1),
      series(2, "A", "C", 1),
      series(3, "A", "DEE", 1),
      series(4, "B", "C", 1),
      series(5, "B", "Dee", 1),
      series(6, "C", "DEE", 1),
    ];

    const table = groupTables([aGroup({ teams: ["A", "B", "C", "Dee"] })], respelled, NOON)[0];

    expect(table?.rows.map((r) => [r.team.name, r.status])).toEqual([
      ["A", "through"],
      ["B", "through"],
      ["C", "out"],
      ["DEE", "out"],
    ]);
  });

  it("marks nobody when a series names a team the page does not list in the group", () => {
    const stranger = [...played4, series(5, "B", "Zed", 1), series(6, "C", "D", 1)];

    expect(statuses(stranger)).toEqual({ A: null, B: null, C: null, D: null });
  });
});

describe("groupTables rules", () => {
  it("shows no table when the page ranks by rules we do not apply", () => {
    const swapped = aGroup({
      tiebreakers: ["matchwins", "matchlosses", "gamediff", "h2hlegacy.matchwins"],
    });

    const table = groupTables([swapped], played4, NOON)[0];

    expect(table).toMatchObject({ supported: false, rows: [] });
  });

  it("names the day only for a two-team tie, not for a bigger one", () => {
    const threeWay = [
      series(1, "A", "B", 1),
      series(2, "A", "C", 1),
      series(3, "A", "D", 1),
      series(4, "B", "C", 0, { round: "Day 2", startsAt: "2026-11-24T10:00:00.000Z" }),
      series(5, "B", "D", 0, { round: "Day 3", startsAt: "2026-11-25T10:00:00.000Z" }),
      series(6, "C", "D", 0, { round: "Day 3", startsAt: "2026-11-25T10:00:00.000Z" }),
    ];

    const rows = groupTables([aGroup()], threeWay, NOON)[0]?.rows ?? [];

    expect(rows.slice(1).map((r) => r.tiebreakRound)).toEqual([null, null, null]);
  });
});

describe("groupTables sources and roster", () => {
  const early = (m: Match): Match => ({ ...m, maps: m.maps.map((x) => ({ ...x, early: true })) });

  const rowOf = (matches: Match[], name: string, group = aGroup()) =>
    groupTables([group], matches, NOON)[0]?.rows.find((r) => r.team.name === name);

  it("never counts a result only mrvl has seen, so a courtesy map cannot settle a series", () => {
    const mrvlOnly = early(series(5, "B", "D", 1));

    expect(rowOf([...played4, mrvlOnly], "B")?.seriesWins).toBe(1);
    expect(rowOf([...played4, mrvlOnly], "D")?.seriesLosses).toBe(1);
  });

  it("keeps an award the page names even when mrvl maps say the other side won", () => {
    const awarded = {
      ...series(5, "B", "D", 0, { markedFinished: true, awarded: 2 }),
      maps: early(series(5, "B", "D", 1)).maps,
    };

    expect(rowOf([...played4, awarded], "D")?.seriesWins).toBe(1);
    expect(rowOf([...played4, awarded], "B")?.seriesLosses).toBe(2);
  });

  it("leaves a series open when its maps give both sides a winning total", () => {
    const stale = series(5, "B", "D", 0, { played: [1, 1, 2, 2] });

    expect(rowOf([...played4, stale], "B")?.seriesWins).toBe(1);
    expect(rowOf([...played4, stale], "D")?.seriesWins).toBe(0);
  });

  const whole = [series(1, "A", "B", 1), series(2, "A", "C", 1), series(3, "B", "C", 1)];

  it("marks nobody when two roster slots name the same team", () => {
    expect(statuses(whole, aGroup({ teams: ["A", "B", "C", "C"] }))).toEqual({
      A: null,
      B: null,
      C: null,
    });
  });

  it("marks nobody when the page leaves a roster slot blank", () => {
    expect(Object.values(statuses(whole, aGroup({ teams: ["A", "B", "C", ""] })))).toEqual([
      null,
      null,
      null,
    ]);
  });

  it("marks nobody while a match list the page declares has no series at all", () => {
    const complete = [...played4, series(5, "B", "D", 1), series(6, "C", "D", 1)];

    expect(Object.values(statuses(complete, aGroup({ matchGroups: ["list", "day2"] })))).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it("refuses tiebreakers packed into one rule, which only look like the supported order when joined", () => {
    const packed = aGroup({
      tiebreakers: ["matchwins,matchlosses", "h2hlegacy.matchwins", "gamediff"],
    });

    expect(groupTables([packed], played4, NOON)[0]).toMatchObject({ supported: false, rows: [] });
  });
});
