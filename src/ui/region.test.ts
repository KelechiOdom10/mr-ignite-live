import { describe, expect, it } from "vitest";

import { HOME_REGIONS } from "@/domain/homeView";

import { REGION_FILTERS } from "./region";

describe("REGION_FILTERS", () => {
  it("matches the regions the home URL can hold, so back restores every filter", () => {
    expect(REGION_FILTERS.map((r) => r.value)).toEqual(HOME_REGIONS);
  });
});
