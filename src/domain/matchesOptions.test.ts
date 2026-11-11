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
  it("lists every event newest first, including ones the recent scope dropped", () => {
    const snapshot = aSnapshot(
      [anEvent("old", "Old Cup", "2026-06-01"), anEvent("new", "New Cup", "2026-10-01")],
      [],
    );

    expect(eventOptions(snapshot)).toEqual([
      { id: "new", name: "New Cup" },
      { id: "old", name: "Old Cup" },
    ]);
  });

  it("puts events without a date after the dated ones", () => {
    const snapshot = aSnapshot(
      [anEvent("tbd", "TBD Cup", null), anEvent("done", "Done", "2026-09-01")],
      [],
    );

    expect(eventOptions(snapshot).map((e) => e.id)).toEqual(["done", "tbd"]);
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
