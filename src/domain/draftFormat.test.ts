import { describe, expect, it } from "vitest";

import { parseSimFormatId, SIM_FORMATS } from "./draftFormat";

describe("parseSimFormatId", () => {
  it("falls back to Ignite when the query is missing or unknown, so a stale link still drafts", () => {
    expect(parseSimFormatId(undefined)).toBe("ignite-2026");
    expect(parseSimFormatId(null)).toBe("ignite-2026");
    expect(parseSimFormatId("")).toBe("ignite-2026");
    expect(parseSimFormatId("mrc")).toBe("ignite-2026");
  });

  it("keeps ranked when a shared link carries it", () => {
    expect(parseSimFormatId("ranked")).toBe("ranked");
    expect(parseSimFormatId("ignite-2026")).toBe("ignite-2026");
  });

  it("names the format each id opens", () => {
    expect(SIM_FORMATS["ignite-2026"].name).toBe("Ignite 2026 tournament draft");
    expect(SIM_FORMATS.ranked.name).toBe("Ranked Competitive bans (one recorded match)");
  });
});
