import { describe, expect, it } from "vitest";

import { DEFAULT_HOME_VIEW, homeViewFromQuery, homeViewSearch } from "./homeView";

describe("homeViewFromQuery", () => {
  it("reads the tabs the reader left", () => {
    expect(homeViewFromQuery({ tab: "results", region: "emea", events: "completed" })).toEqual({
      tab: "results",
      region: "emea",
      events: "completed",
    });
  });

  it("falls back to defaults for missing or unknown values", () => {
    expect(homeViewFromQuery({})).toEqual(DEFAULT_HOME_VIEW);
    expect(homeViewFromQuery({ tab: "live", region: "mars", events: "soon" })).toEqual(
      DEFAULT_HOME_VIEW,
    );
  });
});

describe("homeViewSearch", () => {
  it("leaves defaults out", () => {
    expect(homeViewSearch(DEFAULT_HOME_VIEW)).toBe("");
  });

  it("round-trips a chosen view", () => {
    const view = { tab: "results", region: "china", events: "upcoming" } as const;

    expect(
      homeViewFromQuery(Object.fromEntries(new URLSearchParams(homeViewSearch(view)))),
    ).toEqual(view);
  });
});
