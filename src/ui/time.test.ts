import { describe, expect, it } from "vitest";

import { formatDuration } from "./time";

describe("formatDuration", () => {
  it("rolls 59.6 seconds over into the next minute instead of showing 60s", () => {
    expect(formatDuration(779.6)).toBe("13m 0s");
    expect(formatDuration(347.5)).toBe("5m 48s");
  });
});
