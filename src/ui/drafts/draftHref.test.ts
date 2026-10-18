import { describe, expect, it } from "vitest";

import { draftHref, nextFilter } from "./draftHref";

describe("draftHref", () => {
  it("writes only the filters that are set, so Reset is plain /drafts", () => {
    expect(draftHref({ eventId: null, map: null, mode: null })).toBe("/drafts");
    expect(draftHref({ eventId: "MR Ignite/2026/Stage 2", map: null, mode: "Convoy" })).toBe(
      "/drafts?event=MR+Ignite%2F2026%2FStage+2&mode=Convoy",
    );
  });
});

describe("nextFilter", () => {
  const convoy = { eventId: null, map: null, mode: "Convoy" };

  it("clears the mode when a map is chosen, and the map when a mode is chosen", () => {
    expect(nextFilter(convoy, "map", "Midtown")).toEqual({
      eventId: null,
      map: "Midtown",
      mode: null,
    });
    expect(nextFilter({ eventId: null, map: "Midtown", mode: null }, "mode", "Domination")).toEqual(
      {
        eventId: null,
        map: null,
        mode: "Domination",
      },
    );
  });

  it("changes nothing when the current choice is picked again, so Convoy survives a tap on All maps", () => {
    expect(nextFilter(convoy, "map", null)).toBeNull();
    expect(nextFilter(convoy, "mode", "Convoy")).toBeNull();
  });

  it("lets All modes clear a chosen map, whose mode the server fills in", () => {
    expect(nextFilter({ eventId: null, map: "Midtown", mode: "Convoy" }, "mode", null)).toEqual({
      eventId: null,
      map: null,
      mode: null,
    });
  });

  it("keeps the map and mode when only the event changes", () => {
    expect(nextFilter({ eventId: "a", map: "Midtown", mode: null }, "eventId", "b")).toEqual({
      eventId: "b",
      map: "Midtown",
      mode: null,
    });
  });
});
