/**
 * The game's rank tier from its numeric level (1–25), using the same thresholds as
 * rivalstracker.com's own client. Unknown or missing levels are unranked, not Bronze.
 */
export function rankName(level: number | null): string | null {
  if (level === null || !Number.isInteger(level) || level < 1) return null;

  if (level <= 3) return `Bronze ${3 - level + 1}`;

  if (level <= 6) return `Silver ${6 - level + 1}`;

  if (level <= 9) return `Gold ${9 - level + 1}`;

  if (level <= 12) return `Platinum ${12 - level + 1}`;

  if (level <= 15) return `Diamond ${15 - level + 1}`;

  if (level <= 18) return `Grandmaster ${18 - level + 1}`;

  if (level <= 21) return `Celestial ${21 - level + 1}`;

  if (level <= 22) return "Eternity";

  return "One Above All";
}
