import { describe, expect, it } from "vitest";

import { MATCH_REGIONS } from "@/domain/matchesView";

import { REGION_FILTERS } from "./region";

describe("REGION_FILTERS", () => {
  it("matches the regions the matches URL can hold, so back restores every filter", () => {
    expect(REGION_FILTERS.map((r) => r.value)).toEqual(MATCH_REGIONS);
  });
});
