import { describe, expect, it } from "vitest";

import { aMap, aMatch, anEvent } from "../../test/builders";
import { runningGroupStages } from "./homeStandings";
import { selectedGroup } from "./standings";

const NOW = Date.parse("2026-11-23T19:55:00Z");
const event = anEvent();
const TIEBREAKERS = ["matchwins", "matchlosses", "h2hlegacy.matchwins", "gamediff"];

const group = (title: string, list: string, teams: string[]) => ({
  eventId: event.id,
  title,
  matchGroups: [list],
  advance: 1,
  teams,
  tiebreakers: TIEBREAKERS,
});

const series = (list: string, n: number, a: string, b: string, played = true) =>
  aMatch({
    id: list + "_M" + n,
    eventId: event.id,
    phase: "Group Stage",
    round: "Day 1",
    bestOf: 3,
    startsAt: "2026-11-23T13:00:00Z",
    team1: { name: a, short: a },
    team2: { name: b, short: b },
    maps: played ? [aMap(1, 1), aMap(2, 1)] : [],
  });

const seededBracket = aMatch({
  id: "b_R1M1",
  eventId: event.id,
  phase: "Playoffs",
  startsAt: "2026-11-27T11:00:00Z",
});

const everyone = () => true;

describe("runningGroupStages", () => {
  const groups = [
    group("Group A", "a", ["A1", "A2", "A3"]),
    group("Group B", "b", ["B1", "B2", "B3"]),
  ];

  const roundOne = [
    series("a", 1, "A1", "A2"),
    series("a", 2, "A1", "A3", false),
    series("a", 3, "A2", "A3", false),
    series("b", 1, "B1", "B2"),
    series("b", 2, "B1", "B3", false),
    series("b", 3, "B2", "B3", false),
  ];

  const snapshot = (matches: ReturnType<typeof series>[]) => ({ events: [event], groups, matches });

  it("shows the block while the group stage is running and a series has begun", () => {
    expect(runningGroupStages(snapshot(roundOne), NOW, everyone).map((s) => s.event.id)).toEqual([
      event.id,
    ]);
  });

  it("keeps the block when a fixture the page lists is missing, though every series shown is settled", () => {
    const settled = [
      series("a", 1, "A1", "A2"),
      series("a", 2, "A1", "A3"),
      series("a", 3, "A2", "A3"),
      series("b", 1, "B1", "B2"),
      series("b", 2, "B1", "B3"),
    ];

    expect(runningGroupStages(snapshot([...settled, seededBracket]), NOW, everyone)).toHaveLength(
      1,
    );
  });

  it("drops the block once the schedule is whole and every series has a result", () => {
    const done = roundOne.map((m) => ({ ...m, maps: [aMap(1, 1), aMap(2, 1)] }));

    expect(runningGroupStages(snapshot([...done, seededBracket]), NOW, everyone)).toEqual([]);
  });

  it("leaves out an event the region tab filters away", () => {
    expect(runningGroupStages(snapshot(roundOne), NOW, () => false)).toEqual([]);
  });

  it("keeps a table for the surviving group when the next snapshot drops the one the reader picked", () => {
    const next = { events: [event], groups: groups.slice(0, 1), matches: roundOne.slice(0, 3) };
    const tables = runningGroupStages(next, NOW, everyone)[0]?.tables ?? [];

    expect(tables.map((t) => t.group.title)).toEqual(["Group A"]);
    expect(selectedGroup("Group B", tables)).toBe("Group A");
  });
});
