import { describe, expect, it } from "vitest";

import { DEFAULT_MATCHES_VIEW } from "@/domain/matchesView";

import { filterChips } from "./filterChips";

const events = [{ id: "ignite/finals", name: "Ignite: Grand Finals" }];
const teams = [{ name: "FLY", logo: null, spellings: ["FLY", "FLY Esports"] }];

describe("filterChips", () => {
  it("shows no chips while nothing narrows the results", () => {
    expect(filterChips(DEFAULT_MATCHES_VIEW, events, teams)).toEqual([]);
  });

  it("names each active filter and what clears it", () => {
    const view = {
      ...DEFAULT_MATCHES_VIEW,
      event: "ignite/finals",
      team: "FLY Esports",
      range: "7d" as const,
    };

    expect(filterChips(view, events, teams)).toEqual([
      { key: "event", label: "Event: Ignite: Grand Finals", clear: { event: null } },
      { key: "team", label: "Team: FLY", clear: { team: null } },
      { key: "range", label: "Date: Last 7 days", clear: { range: "any" } },
    ]);
  });

  it("falls back to the raw value when the option list does not hold it", () => {
    const view = { ...DEFAULT_MATCHES_VIEW, event: "gone", team: "Ghosts" };

    expect(filterChips(view, events, teams).map((chip) => chip.label)).toEqual([
      "Event: gone",
      "Team: Ghosts",
    ]);
  });
});
