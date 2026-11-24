import type { EventPhase } from "./matchesView";
import type { IgniteEvent } from "./model";

export function eventPhase(event: IgniteEvent, now: number): EventPhase | null {
  if (!event.startDate && !event.endDate) return null;

  const start = event.startDate ? Date.parse(event.startDate) : Number.NaN;
  const end = event.endDate ? Date.parse(event.endDate) + 86_400_000 : Number.NaN;

  if (!Number.isNaN(start) && now < start) return "upcoming";

  if (!Number.isNaN(end) && now > end) return "completed";

  return "ongoing";
}

export function nextEvent(events: readonly IgniteEvent[], now: number): IgniteEvent | undefined {
  return events
    .filter((e) => e.startDate && eventPhase(e, now) === "upcoming")
    .toSorted((a, b) => Date.parse(a.startDate ?? "") - Date.parse(b.startDate ?? ""))[0];
}
