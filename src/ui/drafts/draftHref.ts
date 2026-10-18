export interface DraftFilterValues {
  eventId: string | null;
  map: string | null;
  mode: string | null;
}

/** The /drafts URL for a filter; "all" is the absence of a value, so it isn't written. */
export function draftHref({ eventId, map, mode }: DraftFilterValues): string {
  const params = new URLSearchParams();
  if (eventId) params.set("event", eventId);
  if (mode) params.set("mode", mode);
  if (map) params.set("map", map);
  const query = params.toString();
  return query ? `/drafts?${query}` : "/drafts";
}
