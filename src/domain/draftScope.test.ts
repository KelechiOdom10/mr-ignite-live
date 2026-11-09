import { describe, expect, it } from "vitest";

import { aMatch } from "../../test/builders";
import { draftScope } from "./draftScope";
import type { IgniteEvent } from "./model";
import type { MatchStats } from "./stats";

const now = Date.parse("2026-10-17T20:00:00Z");

const event = (id: string): IgniteEvent => ({
  id,
  name: id,
  ticker: id,
  region: "Americas",
  stage: "Stage 2",
  startDate: null,
  endDate: null,
  prizePoolUsd: null,
  prizes: [],
  liquipediaUrl: "https://liquipedia.net/marvelrivals/x",
  updatedAt: "2026-10-17T00:00:00.000Z",
  iconFile: null,
  iconUrl: null,
});

const stats = (matchId: string, maps: string[]): MatchStats => ({
  matchId,
  source: "mrvl",
  sourceMatchId: `s-${matchId}`,
  sourceUpdatedAt: "1",
  fetchedAt: "2026-10-17T00:00:00.000Z",
  maps: maps.map((map, i) => ({
    index: i + 1,
    map,
    durationSeconds: 600,
    teams: [
      { name: "A", won: true, score: 1, bans: [], players: [] },
      { name: "B", won: false, score: 0, bans: [], players: [] },
    ],
    draft: null,
  })),
});

const finished = (id: string, eventId: string, startsAt: string) =>
  aMatch({ id, eventId, startsAt, markedFinished: true });

const matches = [
  finished("old", "amer", "2026-10-10T20:00:00.000Z"),
  finished("a1", "amer", "2026-10-16T20:00:00.000Z"),
  finished("a2", "amer", "2026-10-17T10:00:00.000Z"),
  finished("e1", "emea", "2026-10-17T12:00:00.000Z"),
];

const all = [stats("a1", ["Krakoa", "Midtown"]), stats("e1", ["Krakoa"])];
const events = [event("amer"), event("emea"), event("china")];

describe("draftScope", () => {
  it("counts finished series missing a scoreboard only since caching began, and only in the event", () => {
    const amer = draftScope({ stats: all, matches, events, query: { event: "amer" }, now });
    expect(amer.finishedSeriesWithoutStats).toBe(1);
    expect(amer.stats.map((s) => s.matchId)).toEqual(["a1"]);
  });

  it("offers only events that have cached scoreboards and ignores an unknown one", () => {
    const scope = draftScope({ stats: all, matches, events, query: { event: "china" }, now });
    expect(scope.options.events.map((e) => e.id)).toEqual(["amer", "emea"]);
    expect(scope.filter.eventId).toBeNull();
    expect(scope.stats).toHaveLength(2);
  });

  it("takes the mode from the map, so a conflicting mode can't empty the table", () => {
    const scope = draftScope({
      stats: all,
      matches,
      events,
      query: { map: "Midtown", mode: "Domination" },
      now,
    });

    expect(scope.filter).toEqual({ eventId: null, map: "Midtown", mode: "Convoy" });
  });
});
