import { describe, expect, it } from "vitest";

import { aMap, aMatch } from "../../test/builders";
import { defaultStageTab, groupDays, stagePhase, visibleTab } from "./stagePhase";

const NOW = Date.parse("2026-11-23T19:55:00Z");

const played = (id: string, round: string, startsAt: string) =>
  aMatch({ id, phase: "Group Stage", round, startsAt, bestOf: 3, maps: [aMap(1, 1), aMap(2, 1)] });

const coming = (id: string, round: string, startsAt: string) =>
  aMatch({ id, phase: "Group Stage", round, startsAt, bestOf: 3 });

const bracket = (startsAt: string, maps = [aMap(1, 1), aMap(2, 1), aMap(3, 1)]) =>
  aMatch({ id: "b_R1M1", phase: "Playoffs", startsAt, bestOf: 5, maps });

describe("stagePhase", () => {
  it("stays on the groups while a group series is left, even if a playoff slot already has teams", () => {
    const matches = [
      played("g_M1", "Day 1", "2026-11-23T13:00:00Z"),
      coming("g_M2", "Day 2", "2026-11-24T13:00:00Z"),
      bracket("2026-11-27T11:00:00Z", []),
    ];

    expect(stagePhase(matches, NOW)).toBe("groups");
  });

  it("is between the stages once every group series is finished and no playoff series has started", () => {
    const matches = [
      played("g_M1", "Day 1", "2026-11-23T13:00:00Z"),
      bracket("2026-11-27T11:00:00Z", []),
    ];

    expect(stagePhase(matches, NOW)).toBe("between");
  });

  it("is in the playoffs once a playoff series has started", () => {
    const matches = [
      played("g_M1", "Day 1", "2026-11-23T13:00:00Z"),
      bracket("2026-11-27T11:00:00Z"),
    ];

    expect(stagePhase(matches, Date.parse("2026-11-27T11:30:00Z"))).toBe("playoffs");
  });

  it("is in the playoffs when a series started while a group series was never finished", () => {
    const matches = [
      coming("g_M1", "Day 1", "2026-12-01T13:00:00Z"),
      bracket("2026-11-27T11:00:00Z"),
    ];

    expect(stagePhase(matches, Date.parse("2026-11-27T11:30:00Z"))).toBe("playoffs");
  });
});

describe("stagePhase and the card timeout", () => {
  it("stays on the groups when an unplayed series was only closed by the six-hour timeout", () => {
    const stalled = [
      played("g_M1", "Day 1", "2026-11-23T13:00:00Z"),
      coming("g_M2", "Day 1", "2026-11-23T13:00:00Z"),
      bracket("2026-11-27T11:00:00Z", []),
    ];

    expect(stagePhase(stalled, Date.parse("2026-11-26T03:00:00Z"))).toBe("groups");
  });

  it("does not count a walkover the page left without a winner as the end of the group stage", () => {
    const walkover = aMatch({
      id: "g_M2",
      phase: "Group Stage",
      round: "Day 1",
      startsAt: "2026-11-23T13:00:00Z",
      markedFinished: true,
    });

    const first = played("g_M1", "Day 1", "2026-11-23T13:00:00Z");

    expect(stagePhase([first, walkover], NOW)).toBe("groups");
    expect(stagePhase([first, { ...walkover, awarded: 1 }], NOW)).toBe("between");
  });
});

describe("the event tab", () => {
  it("opens on the playoffs once they have started, or the bracket is seeded between the stages", () => {
    expect(defaultStageTab("groups", true)).toBe("groups");
    expect(defaultStageTab("between", true)).toBe("playoffs");
    expect(defaultStageTab("between", false)).toBe("groups");
    expect(defaultStageTab("playoffs", false)).toBe("playoffs");
  });

  it("follows the phase until the reader picks a tab, and drops a pick that no longer exists", () => {
    expect(visibleTab(null, ["groups", "playoffs"], "playoffs")).toBe("playoffs");
    expect(visibleTab("groups", ["groups", "playoffs"], "playoffs")).toBe("groups");
    expect(visibleTab("playoffs", ["groups"], "groups")).toBe("groups");
  });
});

describe("groupDays on the reader's calendar", () => {
  const dateIn = (timeZone: string) => (iso: string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(iso));

  const stage = [
    played("a_M1", "Day 1", "2026-11-23T13:00:00Z"),
    played("a_M2", "Day 1", "2026-11-23T19:00:00Z"),
    coming("b_M1", "Day 2", "2026-11-25T13:00:00Z"),
  ];

  it("stays on today's day after its last series, until the reader's date turns over", () => {
    const evening = Date.parse("2026-11-23T20:30:00Z");

    expect(groupDays(stage, evening).current).toBe("Day 2");
    expect(groupDays(stage, evening, dateIn("Europe/London"))).toMatchObject({
      current: "Day 1",
      today: ["Day 1"],
    });
  });

  it("finds a round with a kickoff on the reader's date even when it crosses their midnight", () => {
    const lateTokyo = Date.parse("2026-11-23T16:00:00Z");

    expect(groupDays(stage, lateTokyo, dateIn("Asia/Tokyo")).today).toEqual(["Day 1"]);
  });

  it("falls back to the first unfinished day when nothing is on the reader's date", () => {
    expect(
      groupDays(stage, Date.parse("2026-11-24T12:00:00Z"), dateIn("Europe/London")).current,
    ).toBe("Day 2");
  });
});

describe("groupDays", () => {
  const matches = [
    coming("g_M3", "Day 2", "2026-11-24T13:00:00Z"),
    played("g_M1", "Day 1", "2026-11-23T13:00:00Z"),
    coming("g_M2", "Day 1", "2026-11-23T21:00:00Z"),
  ];

  it("lists the days in the order they are played", () => {
    expect(groupDays(matches, NOW).days).toEqual(["Day 1", "Day 2"]);
  });

  it("is on the first day with a series still to play", () => {
    expect(groupDays(matches, NOW).current).toBe("Day 1");
    expect(groupDays(matches, Date.parse("2026-11-23T20:00:00Z")).current).toBe("Day 1");
  });

  it("is on the last day once everything is finished", () => {
    const done = [
      played("a_M1", "Day 1", "2026-11-23T13:00:00Z"),
      played("a_M2", "Day 2", "2026-11-24T13:00:00Z"),
    ];

    expect(groupDays(done, NOW).current).toBe("Day 2");
  });

  it("has no current day without matches", () => {
    expect(groupDays([], NOW)).toEqual({ days: [], current: null, today: [] });
  });
});
