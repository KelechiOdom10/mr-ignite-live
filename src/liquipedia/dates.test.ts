import { describe, expect, it } from "vitest";

import { parseLiquipediaDate } from "./dates";

describe("parseLiquipediaDate", () => {
  it("converts a caster-zone time to UTC, crossing the date line", () => {
    // Bug: treating 06:00 AEST as UTC would show Americas matches 10 hours late.
    expect(parseLiquipediaDate("2026-10-16 - 06:00 {{Abbr/AEST}}")).toBe(
      "2026-10-15T20:00:00.000Z",
    );
  });

  it("handles a fractional offset zone", () => {
    expect(parseLiquipediaDate("2026-10-16 - 12:30 {{Abbr/IST}}")).toBe("2026-10-16T07:00:00.000Z");
  });

  it("accepts a bare trailing zone without the Abbr template", () => {
    expect(parseLiquipediaDate("2026-10-16 - 18:00 CEST")).toBe("2026-10-16T16:00:00.000Z");
  });

  it("falls back to UTC midnight when only a date is given", () => {
    expect(parseLiquipediaDate("2026-11-23")).toBe("2026-11-23T00:00:00.000Z");
  });

  it("returns null for empty or unparseable input", () => {
    expect(parseLiquipediaDate(undefined)).toBeNull();
    expect(parseLiquipediaDate("TBD")).toBeNull();
  });
});
