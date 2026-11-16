import { describe, expect, it } from "vitest";

import { aMatch } from "../../test/builders";
import { eventOptions, teamOptions } from "./matchesOptions";
import type { Snapshot, SnapshotEvent } from "./model";

const NOW = Date.parse("2026-10-17T00:00:00.000Z");

function anEvent(id: string, name: string, endDate: string | null): SnapshotEvent {
  return {
    id,
    name,
    ticker: id,
    region: "Americas",
    stage: "Stage 2",
    startDate: "2026-08-01",
    endDate,
    prizePoolUsd: null,
    prizes: [],
    prizesFromBracket: false,
    liquipediaUrl: "https://liquipedia.net/marvelrivals/x",
    updatedAt: "2026-10-16T00:00:00Z",
    iconFile: null,
    iconUrl: null,
  };
}

function aSnapshot(events: SnapshotEvent[], matches: Snapshot["matches"]): Snapshot {
  return {
    builtAt: "2026-10-16T00:00:00.000Z",
    servedAt: "2026-10-16T00:00:00.000Z",
    liquipediaUpdatedAt: null,
    events,
    matches,
    teams: {},
  };
}

describe("eventOptions", () => {
  it("lists events with a finished series newest first, including ones the recent scope dropped", () => {
    const snapshot = aSnapshot(
      [anEvent("old", "Old Cup", "2026-06-01"), anEvent("new", "New Cup", "2026-10-01")],
      [
        aMatch({ id: "old-1", eventId: "old", markedFinished: true }),
        aMatch({ id: "new-1", eventId: "new", markedFinished: true }),
      ],
    );

    expect(eventOptions(snapshot, NOW)).toEqual([
      { id: "new", name: "New Cup" },
      { id: "old", name: "Old Cup" },
    ]);
  });

  it("puts events without a date after the dated ones", () => {
    const snapshot = aSnapshot(
      [anEvent("tbd", "TBD Cup", null), anEvent("done", "Done", "2026-09-01")],
      [
        aMatch({ id: "tbd-1", eventId: "tbd", markedFinished: true }),
        aMatch({ id: "done-1", eventId: "done", markedFinished: true }),
      ],
    );

    expect(eventOptions(snapshot, NOW).map((e) => e.id)).toEqual(["done", "tbd"]);
  });

  it("leaves out an event with no finished series", () => {
    // Choosing Grand Finals always landed on the empty state, because it had only unplayed series.
    const snapshot = aSnapshot(
      [anEvent("played", "Played Cup", "2026-10-01"), anEvent("ahead", "Ahead Cup", "2026-11-29")],
      [
        aMatch({ id: "played-1", eventId: "played", markedFinished: true }),
        aMatch({ id: "ahead-1", eventId: "ahead", startsAt: "2026-12-01T00:00:00.000Z" }),
      ],
    );

    expect(eventOptions(snapshot, NOW).map((e) => e.id)).toEqual(["played"]);
  });

  it("keeps the chosen event offered even when it has no finished series", () => {
    // Dropping it would show "All events" while the filter was still on, which is worse.
    const snapshot = aSnapshot(
      [anEvent("played", "Played Cup", "2026-10-01"), anEvent("ahead", "Ahead Cup", "2026-11-29")],
      [aMatch({ id: "played-1", eventId: "played", markedFinished: true })],
    );

    expect(eventOptions(snapshot, NOW, "ahead").map((e) => e.id)).toEqual(["ahead", "played"]);
  });
});

describe("teamOptions", () => {
  it("offers only teams from finished series, sorted, without duplicates", () => {
    // The team filter listed teams from unplayed series, which selected nothing.
    const snapshot = aSnapshot(
      [],
      [
        aMatch({
          id: "done",
          markedFinished: true,
          team1: { name: "Zeta", short: "Z" },
          team2: { name: "Alpha", short: "A" },
        }),
        aMatch({
          id: "later",
          startsAt: "2026-12-01T00:00:00.000Z",
          team1: { name: "Gamma", short: "G" },
          team2: { name: "Alpha", short: "A" },
        }),
      ],
    );

    expect(teamOptions(snapshot, NOW)).toEqual(["Alpha", "Zeta"]);
  });
});
