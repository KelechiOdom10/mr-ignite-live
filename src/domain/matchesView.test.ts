import { describe, expect, it } from "vitest";

import {
  DEFAULT_MATCHES_VIEW,
  hasResultFilters,
  isEventPhase,
  isListTab,
  isRegionFilter,
  MATCH_REGIONS,
  matchesHref,
  matchesViewFromQuery,
  matchesViewSearch,
} from "./matchesView";

describe("matchesViewFromQuery", () => {
  it("reads the tabs and filters the reader left", () => {
    expect(
      matchesViewFromQuery({
        tab: "results",
        region: "emea",
        events: "completed",
        event: "MR Ignite/2026/Stage 1/EMEA",
        team: "Liquid Citadel",
        range: "7d",
      }),
    ).toEqual({
      tab: "results",
      region: "emea",
      events: "completed",
      event: "MR Ignite/2026/Stage 1/EMEA",
      team: "Liquid Citadel",
      range: "7d",
    });
  });

  it("falls back to defaults for missing or unknown values", () => {
    // ?range=year and ?event= (an empty field) each rendered an empty list instead of all results.
    expect(matchesViewFromQuery({})).toEqual(DEFAULT_MATCHES_VIEW);
    expect(matchesViewFromQuery({ tab: "live", region: "mars", events: "soon" })).toEqual(
      DEFAULT_MATCHES_VIEW,
    );
    expect(matchesViewFromQuery({ range: "year", event: "", team: "" })).toEqual(
      DEFAULT_MATCHES_VIEW,
    );
  });
});

describe("matchesViewSearch", () => {
  it("leaves defaults out", () => {
    expect(matchesViewSearch(DEFAULT_MATCHES_VIEW)).toBe("");
  });

  it("leaves the tab out until the reader picks one", () => {
    const view = { ...DEFAULT_MATCHES_VIEW, tab: null, region: "pacific" } as const;

    expect(matchesViewSearch(view)).toBe("?region=pacific");
    expect(matchesViewFromQuery({ region: "pacific" })).toEqual(view);
  });

  it("round-trips a chosen view, filters included", () => {
    const view = {
      tab: "results",
      region: "china",
      events: "upcoming",
      event: "MR Ignite/2026/Stage 2/China",
      team: "Swamp Gaming",
      range: "30d",
    } as const;

    expect(
      matchesViewFromQuery(Object.fromEntries(new URLSearchParams(matchesViewSearch(view)))),
    ).toEqual(view);
  });
});

describe("hasResultFilters", () => {
  it("ignores the region tab, which is not a results filter", () => {
    expect(hasResultFilters(DEFAULT_MATCHES_VIEW)).toBe(false);
    expect(hasResultFilters({ ...DEFAULT_MATCHES_VIEW, region: "emea" })).toBe(false);
    expect(hasResultFilters({ ...DEFAULT_MATCHES_VIEW, range: "7d" })).toBe(true);
    expect(hasResultFilters({ ...DEFAULT_MATCHES_VIEW, team: "Swamp Gaming" })).toBe(true);
  });
});

describe("matchesHref", () => {
  it("points the home summary's See all links at the matches page, carrying the region", () => {
    expect(matchesHref({ region: "all", tab: null })).toBe("/matches");
    expect(matchesHref({ region: "emea", tab: "results" })).toBe(
      "/matches?tab=results&region=emea",
    );
  });
});

describe("tab guards", () => {
  it("accept only the values the URL can hold", () => {
    expect([isListTab("results"), isListTab("live")]).toEqual([true, false]);
    expect([isRegionFilter("emea"), isRegionFilter("mars")]).toEqual([true, false]);
    expect([isEventPhase("completed"), isEventPhase("done")]).toEqual([true, false]);
  });
});

describe("MATCH_REGIONS", () => {
  it("lists all regions first, in display order", () => {
    expect(MATCH_REGIONS).toEqual(["all", "americas", "emea", "china", "pacific"]);
  });
});
