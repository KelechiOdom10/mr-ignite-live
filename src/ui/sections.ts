export type Section = "matches" | "events" | "drafts" | "players" | "review";

/** Main nav, in order. AppShell adds icons; tests check each href lands in its own section. */
export const NAV_SECTIONS: readonly { href: string; label: string; section: Section }[] = [
  { href: "/matches", label: "Matches", section: "matches" },
  { href: "/events", label: "Events", section: "events" },
  { href: "/drafts", label: "Drafts", section: "drafts" },
  { href: "/players", label: "Players", section: "players" },
  { href: "/review", label: "Review", section: "review" },
];

export const GO_TO_ROUTES = {
  drafts: "/drafts",
  simulator: "/drafts/simulator",
  review: "/review",
};

export function sectionOf(path: string): Section {
  if (/^\/(players?|leaderboard|game)(\/|$)/.test(path)) return "players";

  if (/^\/review(\/|$)/.test(path)) return "review";

  if (/^\/drafts(\/|$)/.test(path)) return "drafts";

  if (/^\/events?(\/|$)/.test(path)) return "events";

  return "matches";
}

export function showsFixtureStrip(section: Section): boolean {
  return section !== "players" && section !== "review";
}
