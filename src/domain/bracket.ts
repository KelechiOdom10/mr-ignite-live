import type { Match } from "./model";

export const PLAYOFFS = "Playoffs";

export function bracketContainer(match: Match): string {
  return `${match.eventId}|${match.id.slice(0, match.id.lastIndexOf("_"))}`;
}
