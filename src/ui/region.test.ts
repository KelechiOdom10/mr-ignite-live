import { describe, expect, it } from "vitest";

import { MATCH_REGIONS } from "@/domain/matchesView";

import { REGION_FILTERS, taggedRegion } from "./region";

describe("REGION_FILTERS", () => {
  it("matches the regions the matches URL can hold, so back restores every filter", () => {
    expect(REGION_FILTERS.map((r) => r.value)).toEqual(MATCH_REGIONS);
  });
});

describe("taggedRegion", () => {
  it("has no tag for an international event, where an INTL tag told readers nothing", () => {
    expect(taggedRegion("Global")).toBeNull();
    expect(taggedRegion(undefined)).toBeNull();
  });

  it("keeps the tag on regional events, including Pacific sub-regions", () => {
    expect(taggedRegion("Americas")).toBe("americas");
    expect(taggedRegion("Pacific Asia")).toBe("pacific");
  });
});
