import { describe, expect, it } from "vitest";

import { aMatch } from "../../test/builders";
import type { IgniteEvent, Snapshot } from "./model";
import { eventIdFromSlug, eventSlug, scopeSnapshot } from "./scope";

const NOW = Date.parse("2026-10-17T00:00:00.000Z");

function anEvent(id: string, endDate: string | null): IgniteEvent {
  return {
    id,
    name: id,
    ticker: id,
    region: "Americas",
    stage: "Stage 2",
    startDate: "2026-08-01",
    endDate,
    prizePoolUsd: null,
    liquipediaUrl: "https://liquipedia.net/marvelrivals/x",
    updatedAt: "2026-10-16T00:00:00Z",
  };
}

function aSnapshot(events: IgniteEvent[], matches: Snapshot["matches"]): Snapshot {
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
      aMatch({ id: "b", eventId: "old", startsAt: "2026-08-01T00:00:00.000Z", maps: [] }),
    ],
  );

  it("keeps events that ended within 30 days and drops older ones", () => {
    const scoped = scopeSnapshot(snapshot, { kind: "recent" }, NOW);
    expect(scoped.events.map((e) => e.id)).toEqual(["current"]);
    expect(scoped.matches.map((m) => m.id)).toEqual(["a"]);
  });

  it("stamps the time it was scoped so the client hydrates with the server's clock", () => {
    expect(scopeSnapshot(snapshot, { kind: "recent" }, NOW).servedAt).toBe(
      new Date(NOW).toISOString(),
    );
  });
});

describe("event slugs", () => {
  it("round-trips a Liquipedia title through a URL path", () => {
    const id = "MR Ignite/2026/Stage 2/Pacific/Asia";
    expect(eventSlug(id)).toBe("MR_Ignite/2026/Stage_2/Pacific/Asia");
    expect(eventIdFromSlug(eventSlug(id))).toBe(id);
  });
});

describe("scopeSnapshot event scope", () => {
  it("does not pull in a live match from another event", () => {
    const snapshot = aSnapshot(
      [anEvent("mine", "2026-10-18"), anEvent("other", "2026-10-18")],
      [
        aMatch({ id: "theirs-live", eventId: "other" }),
        aMatch({ id: "mine", eventId: "mine", startsAt: null }),
      ],
    );
    const scoped = scopeSnapshot(snapshot, { kind: "event", eventId: "mine" }, NOW);
    expect(scoped.matches.map((m) => m.id)).toEqual(["mine"]);
  });
});
