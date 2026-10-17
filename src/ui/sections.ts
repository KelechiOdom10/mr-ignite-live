/**
 * Ranked player pages. They keep the live-match island in the header but drop the esports fixture
 * strip and Liquipedia sync status, which belong to the esports pages.
 */
export function isPlayersPath(path: string): boolean {
  return /^\/(players?|leaderboard|game)(\/|$)/.test(path);
}
