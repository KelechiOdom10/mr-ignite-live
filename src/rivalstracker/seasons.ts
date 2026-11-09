/**
 * Season ids to the label the game uses, from rivalstracker.com's public bundle. The API's
 * `match_season` and `rank_game_id` are ids (`"21"`); pages show `10.5`. An unknown id falls back
 * to the id itself, never a guessed half-season.
 */
const LABELS = new Map<number, string>([
  [1, "0"],
  [2, "1.0"],
  [3, "1.5"],
  [4, "2.0"],
  [5, "2.5"],
  [6, "3.0"],
  [7, "3.5"],
  [8, "4.0"],
  [9, "4.5"],
  [10, "5.0"],
  [11, "5.5"],
  [12, "6.0"],
  [13, "6.5"],
  [14, "7.0"],
  [15, "7.5"],
  [16, "8.0"],
  [17, "8.5"],
  [18, "9.0"],
  [19, "9.5"],
  [20, "10.0"],
  [21, "10.5"],
]);

export function seasonLabel(id: number | string | null): string | null {
  if (id === null) return null;
  const numeric = Number(id);

  return LABELS.get(numeric) ?? String(id);
}
