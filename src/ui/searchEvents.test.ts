import { describe, expect, it } from "vitest";

import { searchEvents } from "./searchEvents";

const events = [
  { id: "a", name: "Ignite 2026 Stage 2: Americas" },
  { id: "b", name: "Ignite 2026 Mid-Season Qualifiers: Americas" },
  { id: "c", name: "Ignite 2026 Mid-Season Qualifiers: EMEA" },
];

describe("searchEvents", () => {
  it("lists every event for an empty or blank search", () => {
    expect(searchEvents(events, "")).toEqual(events);
    expect(searchEvents(events, "   ")).toEqual(events);
  });

  it("finds an old event from a few letters, ignoring case", () => {
    expect(searchEvents(events, "QUAL").map((e) => e.id)).toEqual(["b", "c"]);
  });

  it("needs every word, in any order, so a short phrase narrows further", () => {
    expect(searchEvents(events, "americas qual").map((e) => e.id)).toEqual(["b"]);
  });

  it("returns nothing when no event matches", () => {
    expect(searchEvents(events, "zzz")).toEqual([]);
  });
});
