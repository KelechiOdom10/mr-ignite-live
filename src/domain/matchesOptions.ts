import { matchState } from "./matchState";
import type { Snapshot, SnapshotEvent, TeamInfo } from "./model";
import { teamIdentities } from "./teamIdentity";

export interface EventOption {
  id: string;
  name: string;
}

export interface TeamOption {
  /** The canonical display name: the spelling used by the most finished series. */
  name: string;
  /** The team's logo, from whichever spelling has one, or null when none does. */
  logo: string | null;
  /** Every raw spelling of the team, canonical first, so the filter can find all its series. */
  spellings: string[];
}

function newestFirst(a: SnapshotEvent, b: SnapshotEvent): number {
  return (b.endDate ?? b.startDate ?? "").localeCompare(a.endDate ?? a.startDate ?? "");
}

export function eventOptions(
  snapshot: Snapshot,
  now: number,
  chosen: string | null = null,
): EventOption[] {
  const played = new Set(
    snapshot.matches.filter((m) => matchState(m, now).status === "finished").map((m) => m.eventId),
  );

  return snapshot.events
    .filter((event) => played.has(event.id) || event.id === chosen)
    .toSorted((a, b) => newestFirst(a, b) || a.name.localeCompare(b.name))
    .map((event) => ({ id: event.id, name: event.name }));
}

function logoOf(teams: Record<string, TeamInfo>, spellings: readonly string[]): string | null {
  for (const spelling of spellings) {
    const logo = teams[spelling]?.logoDark ?? teams[spelling]?.logoLight;

    if (logo) return logo;
  }

  return null;
}

export function teamOptions(snapshot: Snapshot, now: number): TeamOption[] {
  const finished = snapshot.matches.filter((m) => matchState(m, now).status === "finished");

  return teamIdentities(finished).map(({ name, spellings }) => ({
    name,
    logo: logoOf(snapshot.teams, spellings),
    spellings,
  }));
}
