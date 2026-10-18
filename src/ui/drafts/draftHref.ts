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

export type DraftFilterField = "eventId" | "mode" | "map";

/**
 * The filter after one choice, or null when nothing changes. A map decides its mode (the server
 * fills it in), so choosing a map clears the mode and any mode choice, "All modes" included,
 * clears the map.
 */
export function nextFilter(
  selected: DraftFilterValues,
  field: DraftFilterField,
  value: string | null,
): DraftFilterValues | null {
  if (selected[field] === value) return null;
  const next = { ...selected, [field]: value };
  if (value !== null && field === "map") next.mode = null;
  if (field === "mode") next.map = null;
  return next;
}
