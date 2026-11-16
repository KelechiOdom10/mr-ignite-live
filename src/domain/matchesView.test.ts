import { describe, expect, it } from "vitest";

import { aMatch } from "../../test/builders";
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
  smartDefaultTab,
  type ListTab,
  upcomingSeries,
  withListTab,
} from "./matchesView";
import type { Match } from "./model";

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

  it("drops results filters from a URL that names Upcoming", () => {
    // A bookmarked ?tab=upcoming&team=… described filters the page never applied.
    expect(
      matchesViewFromQuery({
        tab: "upcoming",
        region: "pacific",
        event: "MR Ignite/2026/Stage 2/EMEA",
        team: "Liquid Citadel",
        range: "7d",
      }),
    ).toEqual({ ...DEFAULT_MATCHES_VIEW, tab: "upcoming", region: "pacific" });
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

describe("withListTab", () => {
  it("drops the results filters when the reader switches to Upcoming", () => {
    // Upcoming ignored event, team and range while the URL kept them, describing a view the page
    // was not showing.
    const onResults = {
      ...DEFAULT_MATCHES_VIEW,
      tab: "results",
      region: "emea",
      event: "MR Ignite/2026/Stage 2/EMEA",
      team: "Liquid Citadel",
      range: "7d",
    } as const;

    expect(withListTab(onResults, "upcoming")).toEqual({
      ...DEFAULT_MATCHES_VIEW,
      tab: "upcoming",
      region: "emea",
    });
  });

  it("keeps them when the reader goes back to Results", () => {
    const onUpcoming = {
      ...DEFAULT_MATCHES_VIEW,
      tab: "upcoming",
      event: "MR Ignite/2026/Stage 2/EMEA",
      team: "Liquid Citadel",
      range: "7d",
    } as const;

    expect(withListTab(onUpcoming, "results")).toEqual({ ...onUpcoming, tab: "results" });
  });
});

describe("upcomingSeries", () => {
  const dated = (id: string, startsAt: string) => aMatch({ id, startsAt });
  const undated = (id: string) => aMatch({ id, startsAt: null });

  it("carries the undated series after the dated ones, soonest first", () => {
    // Upcoming kept only series with a time, so a live Grand Finals bracket left it saying nothing
    // was scheduled.
    const series = [
      undated("bracket_final"),
      dated("later", "2026-11-18T20:00:00.000Z"),
      undated("bracket_qf"),
      dated("sooner", "2026-11-17T18:00:00.000Z"),
    ];

    expect(upcomingSeries(series, 30).map((m) => m.id)).toEqual([
      "sooner",
      "later",
      "bracket_final",
      "bracket_qf",
    ]);
  });

  it("counts only dated series against the limit", () => {
    const series = [
      dated("third", "2026-11-19T20:00:00.000Z"),
      dated("first", "2026-11-17T20:00:00.000Z"),
      dated("second", "2026-11-18T20:00:00.000Z"),
      undated("bracket_final"),
    ];

    expect(upcomingSeries(series, 2).map((m) => m.id)).toEqual([
      "first",
      "second",
      "bracket_final",
    ]);
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

describe("smartDefaultTab", () => {
  const NOW = Date.parse("2026-11-16T18:00:00.000Z");
  const THIRTY_DAYS_AGO = Date.parse("2026-10-17T12:00:00.000Z");
  const played = (startsAt: number) => aMatch({ startsAt: new Date(startsAt).toISOString() });

  // Local-clock hours, so the day boundary is the reader's whatever zone the suite runs in.
  const todayAt = (hour: number) => {
    const d = new Date(NOW);
    d.setHours(hour, 0, 0, 0);

    return d.getTime();
  };

  const tomorrowAt = (hour: number) => {
    const d = new Date(todayAt(hour));
    d.setDate(d.getDate() + 1);

    return d.getTime();
  };

  const cases: Array<[string, [Match[], Match[], Match[]], ListTab]> = [
    [
      "with no live and no upcoming matches but finished results, the default is results",
      [[], [], [played(THIRTY_DAYS_AGO)]],
      "results",
    ],
    [
      "with a series live, the default is upcoming even when nothing else is scheduled",
      [[played(NOW)], [], [played(THIRTY_DAYS_AGO)]],
      "upcoming",
    ],
    [
      "with today's series played and nothing further scheduled, the default is results",
      [[], [], [played(todayAt(12))]],
      "results",
    ],
    [
      "with today's series played and only undated series left, the default stays upcoming",
      [[], [aMatch({ startsAt: null })], [played(todayAt(12))]],
      "upcoming",
    ],
    [
      "with today's series played and the next one dated tomorrow, the default is results",
      [[], [played(tomorrowAt(14))], [played(todayAt(12))]],
      "results",
    ],
    [
      "with more scheduled later today, the default stays upcoming",
      [[], [played(todayAt(21))], [played(todayAt(12))]],
      "upcoming",
    ],
    [
      "with everything scheduled for later days, the default stays upcoming",
      [[], [played(tomorrowAt(14))], [played(THIRTY_DAYS_AGO)]],
      "upcoming",
    ],
    [
      "with nothing played and nothing scheduled, the default stays upcoming",
      [[], [], []],
      "upcoming",
    ],
  ];

  it.each(cases)("%s", (_name, [live, upcoming, results], expected) => {
    expect(smartDefaultTab(live, upcoming, results, NOW)).toBe(expected);
  });
});
