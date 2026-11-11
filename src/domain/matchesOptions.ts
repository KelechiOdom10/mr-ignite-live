import { matchState } from "./matchState";
import type { Snapshot, SnapshotEvent } from "./model";

export interface EventOption {
  id: string;
  name: string;
}

function newestFirst(a: SnapshotEvent, b: SnapshotEvent): number {
  return (b.endDate ?? b.startDate ?? "").localeCompare(a.endDate ?? a.startDate ?? "");
}

/**
 * The event filter's choices. They come from the full snapshot, because the page's scoped one
 * holds only the recent events plus the chosen filters' matches.
 */
export function eventOptions(snapshot: Snapshot): EventOption[] {
  return snapshot.events
    .toSorted((a, b) => newestFirst(a, b) || a.name.localeCompare(b.name))
    .map((event) => ({ id: event.id, name: event.name }));
}

export function teamOptions(snapshot: Snapshot, now: number): string[] {
  const names = new Set<string>();

  for (const match of snapshot.matches) {
    if (matchState(match, now).status !== "finished") continue;

    if (match.team1) names.add(match.team1.name);

    if (match.team2) names.add(match.team2.name);
  }

  return [...names].sort((a, b) => a.localeCompare(b));
}
