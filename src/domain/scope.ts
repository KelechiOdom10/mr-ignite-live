import { matchState } from "./matchState";
import type { Snapshot } from "./model";

const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type SnapshotScope = { kind: "recent" } | { kind: "event"; eventId: string };

export function scopeSnapshot(snapshot: Snapshot, scope: SnapshotScope, now: number): Snapshot {
  const isRecent = (eventId: string) => {
    const event = snapshot.events.find((e) => e.id === eventId);
    const end = event?.endDate ? Date.parse(event.endDate) : Number.NaN;
    return Number.isNaN(end) || now - end < RECENT_WINDOW_MS;
  };
  const matches = snapshot.matches.filter((m) =>
    scope.kind === "event"
      ? m.eventId === scope.eventId
      : isRecent(m.eventId) || matchState(m, now).status === "live",
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
