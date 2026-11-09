/** `game_mode_id` to the label the game uses, from rivalstracker.com's own switch. */
const MODES = new Map<number, string>([
  [1, "Quick Match"],
  [2, "Competitive"],
  [3, "Custom"],
  [4, "Arcade"],
  [5, "Tutorial"],
  [6, "Practice"],
  [7, "Practice vs AI"],
  [9, "Tournament"],
]);

export function gameModeLabel(id: number | null): string | null {
  if (id === null) return null;

  return MODES.get(id) ?? null;
}
