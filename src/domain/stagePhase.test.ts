import { describe, expect, it } from "vitest";

import { aMap, aMatch } from "../../test/builders";
import { groupDays, stagePhase } from "./stagePhase";

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
    expect(groupDays([], NOW)).toEqual({ days: [], current: null });
  });
});
