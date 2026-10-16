import { matchState } from "./matchState";
import type { Match, Snapshot } from "./model";

const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type SnapshotScope =
  | { kind: "recent" }
  | { kind: "event"; eventId: string }
  | { kind: "match"; matchId: string };

function involvesTeam(match: Match, names: ReadonlySet<string>): boolean {
  return names.has(match.team1?.name ?? "") || names.has(match.team2?.name ?? "");
}

export function scopeSnapshot(snapshot: Snapshot, scope: SnapshotScope, now: number): Snapshot {
  const isRecent = (eventId: string) => {
    const event = snapshot.events.find((e) => e.id === eventId);
    const end = event?.endDate ? Date.parse(event.endDate) : Number.NaN;
    return Number.isNaN(end) || now - end < RECENT_WINDOW_MS;
  };
  const focus =
    scope.kind === "match" ? snapshot.matches.find((m) => m.id === scope.matchId) : undefined;
  const focusEventId = scope.kind === "event" ? scope.eventId : focus?.eventId;
  const focusTeams = new Set(
    [focus?.team1?.name, focus?.team2?.name].filter((n) => n !== undefined),
  );

  const matches = snapshot.matches.filter(
    (m) =>
      isRecent(m.eventId) ||
      matchState(m, now).status === "live" ||
      m.eventId === focusEventId ||
      involvesTeam(m, focusTeams),
  );
  const eventIds = new Set(matches.map((m) => m.eventId));
  return {
    ...snapshot,
    servedAt: new Date(now).toISOString(),
    events: snapshot.events.filter((e) => eventIds.has(e.id)),
    matches,
  };
}

export function matchesOfEvent(snapshot: Snapshot, eventId: string): Match[] {
  return snapshot.matches.filter((m) => m.eventId === eventId);
}

export function scopeFromQuery(query: { event?: string; match?: string }): SnapshotScope {
  if (query.match) return { kind: "match", matchId: query.match };
  if (query.event) return { kind: "event", eventId: query.event };
  return { kind: "recent" };
}

export function eventSlug(eventId: string): string {
  return eventId.replace(/ /g, "_");
}

export function eventIdFromSlug(slug: string): string {
  return decodeURIComponent(slug).replace(/_/g, " ");
}
