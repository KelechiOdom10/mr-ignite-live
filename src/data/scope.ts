import type { Snapshot } from "./model";
import { matchState } from "./model";

const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type SnapshotScope = { kind: "recent" } | { kind: "event"; eventId: string };

export function scopeSnapshot(
  snapshot: Snapshot,
  scope: SnapshotScope,
  now = Date.now(),
): Snapshot {
  const keep = (eventId: string) => {
    if (scope.kind === "event") return eventId === scope.eventId;
    const event = snapshot.events.find((e) => e.id === eventId);
    const end = event?.endDate ? Date.parse(event.endDate) : NaN;
    return Number.isNaN(end) || now - end < RECENT_WINDOW_MS;
  };
  const matches = snapshot.matches.filter(
    (m) => keep(m.eventId) || matchState(m, now).status === "live",
  );
  const eventIds = new Set(matches.map((m) => m.eventId));
  return {
    ...snapshot,
    servedAt: new Date(now).toISOString(),
    events: snapshot.events.filter((e) => eventIds.has(e.id)),
    matches,
  };
}

export function scopeFromQuery(event: string | undefined): SnapshotScope {
  return event ? { kind: "event", eventId: event } : { kind: "recent" };
}

export function eventSlug(eventId: string): string {
  return eventId.replace(/ /g, "_");
}

export function eventIdFromSlug(slug: string): string {
  return decodeURIComponent(slug).replace(/_/g, " ");
}
