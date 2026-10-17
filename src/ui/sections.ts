/**
 * Ranked player pages. They keep the live-match island and its sync status but drop the esports
 * fixture strip, which belongs to the esports pages.
 */
export function isPlayersPath(path: string): boolean {
  return /^\/(players?|leaderboard|game)(\/|$)/.test(path);
}
