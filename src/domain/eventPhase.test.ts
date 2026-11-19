import { describe, expect, it } from "vitest";

import { anEvent } from "../../test/builders";
import { eventPhase, nextEvent } from "./eventPhase";

const NOW = Date.parse("2026-11-19T13:00:00.000Z");

describe("eventPhase", () => {
  it("keeps an event with no dates off the schedule instead of calling it ongoing", () => {
    expect(eventPhase(anEvent({ startDate: null, endDate: null }), NOW)).toBeNull();
  });

  it("calls an event ongoing through the whole of its last day", () => {
    const event = anEvent({ startDate: "2026-11-17", endDate: "2026-11-19" });

    expect(eventPhase(event, NOW)).toBe("ongoing");
    expect(eventPhase(event, Date.parse("2026-11-20T00:00:00.000Z"))).toBe("ongoing");
    expect(eventPhase(event, Date.parse("2026-11-20T00:00:01.000Z"))).toBe("completed");
  });

  it("calls an event upcoming before its first day", () => {
    expect(eventPhase(anEvent(), NOW)).toBe("upcoming");
  });
});

describe("nextEvent", () => {
  it("picks the soonest dated event and ignores undated pages", () => {
    const finals = anEvent();
    const qualifier = anEvent({ id: "q", startDate: "2026-11-21", endDate: "2026-11-22" });
    const hub = anEvent({ id: "hub", startDate: null, endDate: null });

    expect(nextEvent([hub, finals, qualifier], NOW)).toBe(qualifier);
  });

  it("returns nothing when only finished or undated events exist", () => {
    const done = anEvent({ id: "done", startDate: "2026-10-01", endDate: "2026-10-05" });
    const hub = anEvent({ id: "hub", startDate: null, endDate: null });

    expect(nextEvent([done, hub], NOW)).toBeUndefined();
  });
});
