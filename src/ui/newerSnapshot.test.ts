import { describe, expect, it } from "vitest";

import type { Snapshot } from "@/domain/model";

import { newerSnapshot } from "./newerSnapshot";

function aSnapshot(servedAt: string): Snapshot {
  return {
    builtAt: "2026-10-16T23:00:00.000Z",
    servedAt,
    liquipediaUpdatedAt: null,
    events: [],
    matches: [],
    groups: [],
    teams: {},
  };
}

describe("newerSnapshot", () => {
  const current = aSnapshot("2026-10-16T23:50:00.000Z");

  it("keeps the current snapshot when a slower, older refetch lands after a newer one", () => {
    // The 45s poll and an SSE-triggered refetch can overlap; the older response used to win.
    expect(newerSnapshot(current, aSnapshot("2026-10-16T23:49:59.000Z"))).toBe(current);
  });

  it("takes a snapshot served later", () => {
    const next = aSnapshot("2026-10-16T23:50:01.000Z");
    expect(newerSnapshot(current, next)).toBe(next);
  });
});
