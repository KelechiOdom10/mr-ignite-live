import type { Match, Team } from "./model";

export function participantsOf(matches: Match[]): Team[] {
  const byName = new Map<string, Team>();

  for (const match of matches) {
    for (const team of [match.team1, match.team2]) {
      if (team) byName.set(team.name, team);
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, "en"));
}
