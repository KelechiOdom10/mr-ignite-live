import { describe, expect, it } from "vitest";

import { DEFAULT_MATCHES_VIEW, type MatchesView } from "@/domain/matchesView";
import type { IgniteEvent } from "@/domain/model";

import { aMatch } from "../../test/builders";
import { filterResults } from "./filterResults";

const NOW = Date.parse("2026-10-17T00:00:00.000Z");

function anEvent(id: string, region: string): IgniteEvent {
  return {
    id,
    name: id,
    ticker: id,
    region,
    stage: "Stage 2",
    startDate: "2026-08-01",
    endDate: "2026-10-18",
    prizePoolUsd: null,
    prizes: [],
    liquipediaUrl: "https://liquipedia.net/marvelrivals/x",
    updatedAt: "2026-10-16T00:00:00Z",
    iconFile: null,
    iconUrl: null,
  };
}

const events = new Map([
  ["emea", anEvent("emea", "EMEA")],
  ["americas", anEvent("americas", "Americas")],
]);

const matches = [
  aMatch({
    id: "emea-old",
    eventId: "emea",
    markedFinished: true,
    startsAt: "2026-09-01T12:00:00.000Z",
    team1: { name: "Bravo", short: "B" },
    team2: { name: "Charlie", short: "C" },
  }),
  aMatch({
    id: "emea-20d",
    eventId: "emea",
    markedFinished: true,
    startsAt: "2026-09-27T12:00:00.000Z",
    team1: { name: "Foxtrot", short: "F" },
    team2: { name: "Golf", short: "G" },
  }),
  aMatch({
    id: "americas-now",
    eventId: "americas",
    markedFinished: true,
    startsAt: "2026-10-15T12:00:00.000Z",
    team1: { name: "Alpha", short: "A" },
    team2: { name: "Delta", short: "D" },
  }),
  aMatch({
    id: "emea-now",
    eventId: "emea",
    markedFinished: true,
    startsAt: "2026-10-16T12:00:00.000Z",
    team1: { name: "Alpha", short: "A" },
    team2: { name: "Bravo", short: "B" },
  }),
  aMatch({
    id: "emea-later",
    eventId: "emea",
    startsAt: "2026-12-01T12:00:00.000Z",
    team1: { name: "Alpha", short: "A" },
    team2: { name: "Echo", short: "E" },
  }),
];

function view(overrides: Partial<MatchesView> = {}): MatchesView {
  return { ...DEFAULT_MATCHES_VIEW, tab: "results", ...overrides };
}

function ids(shown: readonly { id: string }[]): string[] {
  return shown.map((m) => m.id);
}

describe("filterResults", () => {
  it("lists finished series newest first, and never the ones still to play", () => {
    expect(ids(filterResults(matches, events, view(), NOW))).toEqual([
      "emea-now",
      "americas-now",
      "emea-20d",
      "emea-old",
    ]);
  });

  it("narrows to one event", () => {
    expect(ids(filterResults(matches, events, view({ event: "americas" }), NOW))).toEqual([
      "americas-now",
    ]);
  });

  it("narrows to one team's series, whichever side it is on", () => {
    // Filtering by team also hid its wins when it was listed as team2.
    expect(ids(filterResults(matches, events, view({ team: "Bravo" }), NOW))).toEqual([
      "emea-now",
      "emea-old",
    ]);
  });

  it("drops series older than the chosen range", () => {
    expect(ids(filterResults(matches, events, view({ range: "7d" }), NOW))).toEqual([
      "emea-now",
      "americas-now",
    ]);
    expect(ids(filterResults(matches, events, view({ range: "30d" }), NOW))).toEqual([
      "emea-now",
      "americas-now",
      "emea-20d",
    ]);
  });

  it("combines the filters with the region tab", () => {
    expect(ids(filterResults(matches, events, view({ region: "emea", range: "7d" }), NOW))).toEqual(
      ["emea-now"],
    );
    expect(
      ids(filterResults(matches, events, view({ region: "pacific", team: "Alpha" }), NOW)),
    ).toEqual([]);
  });
});
