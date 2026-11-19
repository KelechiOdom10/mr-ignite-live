import type { EventOption } from "@/domain/matchesOptions";

export function searchEvents(events: readonly EventOption[], query: string): EventOption[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);

  return events.filter((event) => {
    const name = event.name.toLowerCase();

    return words.every((word) => name.includes(word));
  });
}
