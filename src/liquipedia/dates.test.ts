import { describe, expect, it } from "vitest";

import { parseLiquipediaDate } from "./dates";

describe("parseLiquipediaDate", () => {
  it("converts a caster-zone time to UTC, crossing the date line", () => {
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

  it("reads the long month format the Grand Finals pages use, which only ISO dates parsed before", () => {
    expect(parseLiquipediaDate("November 23, 2026 - 14:00 {{Abbr/CET}}")).toBe(
      "2026-11-23T13:00:00.000Z",
    );
  });

  it("reads a long date with no time as UTC midnight and rejects an unknown month", () => {
    expect(parseLiquipediaDate("November 27, 2026")).toBe("2026-11-27T00:00:00.000Z");
    expect(parseLiquipediaDate("Smarch 27, 2026 - 12:00 {{Abbr/CET}}")).toBeNull();
  });

  it("falls back to UTC midnight when only a date is given", () => {
    expect(parseLiquipediaDate("2026-11-23")).toBe("2026-11-23T00:00:00.000Z");
  });

  it("returns null for empty or unparseable input", () => {
    expect(parseLiquipediaDate(undefined)).toBeNull();
    expect(parseLiquipediaDate("TBD")).toBeNull();
  });
});
