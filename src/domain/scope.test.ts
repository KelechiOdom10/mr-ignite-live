import { describe, expect, it } from "vitest";

import { aMatch } from "../../test/builders";
import recorded from "../../test/fixtures/snapshot/stage2-americas.json";
import { matchState } from "./matchState";
import { SnapshotSchema } from "./model";
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
    groups: [],
    teams: {},
  };
}

describe("scopeSnapshot", () => {
  it("does not lose recorded results when the clock crosses the event's 30-day cutoff", () => {
    const archive = SnapshotSchema.parse({ ...recorded, groups: [] });

    for (const date of ["2026-11-16T23:59:59Z", "2026-11-17T00:00:00Z", "2026-11-18T12:00:00Z"]) {
      const now = Date.parse(date);

      for (const query of [{}, { view: "matches" }]) {
        const scoped = scopeSnapshot(archive, scopeFromQuery(query), now);
        const results = scoped.matches.filter((m) => matchState(m, now).status === "finished");

        expect(results).toHaveLength(44);
        expect(results.at(-1)?.id).toBe("kOKqgtPHq4_R5M1");
      }
    }
  });

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

  it("keeps a group stage's standings only for events in scope", () => {
    const group = (eventId: string) => ({
      eventId,
      title: "Group A",
      matchGroups: ["l"],
      advance: 4,
      teams: [],
      tiebreakers: [],
    });

    const withGroups = {
      ...aSnapshot([anEvent("current", "2026-10-18"), anEvent("other", "2026-10-18")], []),
      groups: [group("current"), group("other")],
    };

    const scoped = scopeSnapshot(withGroups, { kind: "event", eventId: "current" }, NOW);
    expect(scoped.groups.map((g) => g.eventId)).toEqual(["current"]);
  });

  it("keeps the home archive even when events ended more than 30 days ago", () => {
    const scoped = scopeSnapshot(snapshot, { kind: "recent" }, NOW);
    expect(scoped.events.map((e) => e.id)).toEqual(["current", "old"]);
    expect(scoped.matches.map((m) => m.id)).toEqual(["a", "b", "c"]);
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
    const scoped = scopeSnapshot(snapshot, { kind: "matches", eventId: "old" }, NOW);
    expect(scoped.matches.map((m) => m.id).sort()).toEqual(["a", "b", "c"]);
    expect(scoped.events.map((e) => e.id).sort()).toEqual(["current", "old"]);
  });

  it("keeps the archive available when a team filter is chosen", () => {
    const scoped = scopeSnapshot(snapshot, { kind: "matches", team: "Swamp Gaming" }, NOW);
    expect(scoped.matches.map((m) => m.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("carries every spelling of the chosen team, so its older series reach the page", () => {
    const spelled = aSnapshot(
      [current, old],
      [
        aMatch({
          id: "canonical",
          eventId: "old",
          startsAt: "2026-08-01T00:00:00.000Z",
          team1: { name: "100 Thieves", short: "100T" },
          team2: { name: "Alpha", short: "A" },
        }),
        aMatch({
          id: "lowercase",
          eventId: "old",
          startsAt: "2026-08-02T00:00:00.000Z",
          team1: { name: "100 thieves", short: "100T" },
          team2: { name: "Bravo", short: "B" },
        }),
        aMatch({
          id: "elsewhere",
          eventId: "old",
          startsAt: "2026-08-02T00:00:00.000Z",
          team1: { name: "Charlie", short: "C" },
          team2: { name: "Bravo", short: "B" },
        }),
      ],
    );

    const scoped = scopeSnapshot(spelled, { kind: "matches", team: "100 Thieves" }, NOW);

    expect(scoped.matches.map((m) => m.id).sort()).toEqual(["canonical", "elsewhere", "lowercase"]);
  });

  it("keeps the unfiltered matches archive independent of the recent window", () => {
    const scoped = scopeSnapshot(snapshot, { kind: "matches" }, NOW);
    expect(scoped.matches.map((m) => m.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps the requested event on its page before its bracket has any matches", () => {
    const announced = anEvent("announced", null);

    const scoped = scopeSnapshot(
      aSnapshot([announced, old], []),
      { kind: "event", eventId: "announced" },
      NOW,
    );

    expect(scoped.events.map((e) => e.id)).toEqual(["announced"]);
  });

  it("keeps every event, however old, for the events list, with only near-term matches", () => {
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
    expect(eventIdFromSlug("%E0%A4%A")).toBeNull();
  });
});
