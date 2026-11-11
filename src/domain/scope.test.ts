import { describe, expect, it } from "vitest";

import { aMatch } from "../../test/builders";
import type { Snapshot, SnapshotEvent } from "./model";
import { eventIdFromSlug, eventSlug, matchesOfEvent, scopeFromQuery, scopeSnapshot } from "./scope";

const NOW = Date.parse("2026-10-17T00:00:00.000Z");

function anEvent(id: string, endDate: string | null): SnapshotEvent {
  return {
    id,
    name: id,
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

describe("scopeSnapshot", () => {
  const current = anEvent("current", "2026-10-18");
  const old = anEvent("old", "2026-08-01");

  const snapshot = aSnapshot(
    [current, old],
    [
      aMatch({ id: "a", eventId: "current" }),
      aMatch({
        id: "b",
        eventId: "old",
        startsAt: "2026-08-01T00:00:00.000Z",
        team1: { name: "Old Team", short: "OLD" },
        team2: { name: "Swamp Gaming", short: "SG" },
      }),
      aMatch({
        id: "c",
        eventId: "old",
        startsAt: "2026-08-01T00:00:00.000Z",
        team1: { name: "Nobody", short: "NB" },
        team2: { name: "Someone", short: "SO" },
      }),
    ],
  );

  it("keeps events that ended within 30 days and drops older ones", () => {
    const scoped = scopeSnapshot(snapshot, { kind: "recent" }, NOW);
    expect(scoped.events.map((e) => e.id)).toEqual(["current"]);
    expect(scoped.matches.map((m) => m.id)).toEqual(["a"]);
  });

  it("adds an older event's matches on its event page", () => {
    const scoped = scopeSnapshot(snapshot, { kind: "event", eventId: "old" }, NOW);
    expect(scoped.matches.map((m) => m.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("adds both teams' older matches on a match page, for form and head-to-head", () => {
    const scoped = scopeSnapshot(snapshot, { kind: "match", matchId: "a" }, NOW);
    expect(scoped.matches.map((m) => m.id).sort()).toEqual(["a", "b"]);
  });

  it("adds an old event's matches to the matches page when its filter is chosen", () => {
    // Picking an event in the results filter showed no results: the recent scope had dropped it.
    const scoped = scopeSnapshot(snapshot, { kind: "matches", eventId: "old" }, NOW);
    expect(scoped.matches.map((m) => m.id).sort()).toEqual(["a", "b", "c"]);
    expect(scoped.events.map((e) => e.id).sort()).toEqual(["current", "old"]);
  });

  it("adds a team's old matches to the matches page when it is the chosen team", () => {
    const scoped = scopeSnapshot(snapshot, { kind: "matches", team: "Swamp Gaming" }, NOW);
    expect(scoped.matches.map((m) => m.id).sort()).toEqual(["a", "b"]);
  });

  it("scopes the matches page to the recent window until a filter is chosen", () => {
    const scoped = scopeSnapshot(snapshot, { kind: "matches" }, NOW);
    expect(scoped.matches.map((m) => m.id)).toEqual(["a"]);
  });

  it("keeps the requested event on its page before its bracket has any matches", () => {
    // Announced stages showed "Event not found" because events without matches were dropped.
    const announced = anEvent("announced", null);

    const scoped = scopeSnapshot(
      aSnapshot([announced, old], []),
      { kind: "event", eventId: "announced" },
      NOW,
    );

    expect(scoped.events.map((e) => e.id)).toEqual(["announced"]);
  });

  it("keeps every event, however old, for the events list, with only near-term matches", () => {
    // The events page lost long-finished stages on its first live refresh.
    const scoped = scopeSnapshot(snapshot, { kind: "events" }, NOW);
    expect(scoped.events.map((e) => e.id)).toEqual(["current", "old"]);
    expect(scoped.matches.map((m) => m.id)).toEqual(["a"]);
  });

  it("keeps a near-term playoff match's earlier bracket series so Hide spoilers can mask who advanced", () => {
    const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();
    const final = aMatch({ id: "kOK_R4M1", eventId: "current", startsAt: daysAgo(-1) });
    const semi = aMatch({ id: "kOK_R2M1", eventId: "current", startsAt: daysAgo(4) });
    const otherBracket = aMatch({ id: "zzz_R2M1", eventId: "current", startsAt: daysAgo(4) });

    const groupGame = aMatch({
      id: "kOK_R1M9",
      eventId: "current",
      phase: "Group Stage",
      startsAt: daysAgo(4),
    });

    const scoped = scopeSnapshot(
      aSnapshot([current], [semi, otherBracket, groupGame, final]),
      { kind: "events" },
      NOW,
    );

    expect(scoped.matches.map((m) => m.id)).toEqual(["kOK_R2M1", "kOK_R4M1"]);
  });

  it("stamps the time it was scoped so the client hydrates with the server's clock", () => {
    expect(scopeSnapshot(snapshot, { kind: "recent" }, NOW).servedAt).toBe(
      new Date(NOW).toISOString(),
    );
  });
});

describe("matchesOfEvent", () => {
  it("does not list a live match from another event", () => {
    const snapshot = aSnapshot(
      [anEvent("mine", "2026-10-18"), anEvent("other", "2026-10-18")],
      [aMatch({ id: "theirs-live", eventId: "other" }), aMatch({ id: "mine", eventId: "mine" })],
    );

    expect(matchesOfEvent(snapshot, "mine").map((m) => m.id)).toEqual(["mine"]);
  });
});

describe("scopeFromQuery", () => {
  it("reads the events-list view so its refreshes keep every event", () => {
    expect(scopeFromQuery({ view: "events" })).toEqual({ kind: "events" });
  });

  it("reads the matches page's filters so its refreshes keep the chosen event and team", () => {
    expect(scopeFromQuery({ view: "matches", event: "old", team: "Swamp Gaming" })).toEqual({
      kind: "matches",
      eventId: "old",
      team: "Swamp Gaming",
    });
  });
});

describe("event slugs", () => {
  it("round-trips a Liquipedia title through a URL path", () => {
    const id = "MR Ignite/2026/Stage 2/Pacific/Asia";
    expect(eventSlug(id)).toBe("MR_Ignite/2026/Stage_2/Pacific/Asia");
    expect(eventIdFromSlug(eventSlug(id))).toBe(id);
  });

  it("returns null for a malformed escape instead of throwing", () => {
    // /event/%E0%A4%A threw URIError and answered 500 instead of 404.
    expect(eventIdFromSlug("%E0%A4%A")).toBeNull();
  });
});
