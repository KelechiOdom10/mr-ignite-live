import { describe, expect, it } from "vitest";

import { MATCH_REGIONS } from "@/domain/matchesView";

import { REGION_FILTERS, regionLabel } from "./region";

describe("REGION_FILTERS", () => {
  it("matches the regions the matches URL can hold, so back restores every filter", () => {
    expect(REGION_FILTERS.map((r) => r.value)).toEqual(MATCH_REGIONS);
  });
});

describe("regionLabel", () => {
  it("tags an international event INTL, so its matches and rows still say it is international", () => {
    expect(regionLabel("Global").text).toBe("INTL");
    expect(regionLabel(undefined).text).toBe("INTL");
  });

  it("names the group instead of INTL on an international event's group-stage series", () => {
    expect(regionLabel("Global", "Group A").text).toBe("Group A");
  });

  it("keeps INTL on an international event's series that sit in no group, such as the playoffs", () => {
    expect(regionLabel("Global", null).text).toBe("INTL");
  });

  it("keeps the region on regional events, including Pacific sub-regions, whatever the group", () => {
    expect(regionLabel("Americas", "Group A").text).toBe("AMER");
    expect(regionLabel("Pacific Asia").text).toBe("PAC");
  });
});
