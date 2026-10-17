import { describe, expect, it } from "vitest";

import { NAV_SECTIONS, sectionOf, showsFixtureStrip, type Section } from "./sections";

describe("sectionOf", () => {
  it("puts every page in the section its nav item highlights", () => {
    const cases: [string, Section][] = [
      ["/", "matches"],
      ["/match/abc", "matches"],
      ["/events", "events"],
      ["/event/MR_Ignite/2026", "events"],
      ["/drafts", "drafts"],
      ["/drafts/simulator", "drafts"],
      ["/players", "players"],
      ["/player/670067075", "players"],
      ["/leaderboard", "players"],
      ["/game/5513337_1", "players"],
      ["/review", "review"],
    ];
    for (const [path, section] of cases) expect([path, sectionOf(path)]).toEqual([path, section]);
  });

  it("doesn't match look-alike prefixes", () => {
    for (const path of ["/playersx", "/games", "/reviews", "/draftsy", "/eventful"]) {
      expect([path, sectionOf(path)]).toEqual([path, "matches"]);
    }
  });
});

describe("NAV_SECTIONS", () => {
  it("highlights each nav item on its own page", () => {
    for (const item of NAV_SECTIONS) {
      expect([item.href, sectionOf(item.href)]).toEqual([item.href, item.section]);
    }
  });
});

describe("showsFixtureStrip", () => {
  it("keeps the fixture strip on esports sections only", () => {
    expect(showsFixtureStrip("matches")).toBe(true);
    expect(showsFixtureStrip("events")).toBe(true);
    expect(showsFixtureStrip("drafts")).toBe(true);
    expect(showsFixtureStrip("players")).toBe(false);
    expect(showsFixtureStrip("review")).toBe(false);
  });
});
