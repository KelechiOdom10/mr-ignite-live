export type Section = "matches" | "events" | "drafts" | "players" | "review";

/** Main nav, in order. AppShell adds icons; tests check each href lands in its own section. */
export const NAV_SECTIONS: readonly { href: string; label: string; section: Section }[] = [
  { href: "/", label: "Matches", section: "matches" },
  { href: "/events", label: "Events", section: "events" },
  { href: "/drafts", label: "Drafts", section: "drafts" },
  { href: "/players", label: "Players", section: "players" },
  { href: "/review", label: "Review", section: "review" },
];

/** Pages global search links to directly, besides the nav. */
export const GO_TO_ROUTES = {
  drafts: "/drafts",
  simulator: "/drafts/simulator",
  review: "/review",
};

/** Which nav section a path belongs to; anything unrecognised reads as the esports home. */
export function sectionOf(path: string): Section {
  if (/^\/(players?|leaderboard|game)(\/|$)/.test(path)) return "players";
  if (/^\/review(\/|$)/.test(path)) return "review";
  if (/^\/drafts(\/|$)/.test(path)) return "drafts";
  if (/^\/events?(\/|$)/.test(path)) return "events";
  return "matches";
}

/**
 * The esports fixture strip belongs to the esports sections. Personal pages (ranked players and
 * your own reviews) keep the live island and its sync status but drop the strip.
 */
export function showsFixtureStrip(section: Section): boolean {
  return section !== "players" && section !== "review";
}
