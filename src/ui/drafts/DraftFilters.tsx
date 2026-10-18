import type { GameMode } from "@/domain/maps";

const FIELD = "h-9 rounded-md border bg-background px-2 text-sm";

export interface DraftFilterOptions {
  events: { id: string; name: string }[];
  maps: string[];
  modes: readonly GameMode[];
}

export function DraftFilters({
  options,
  selected,
}: {
  options: DraftFilterOptions;
  selected: { eventId: string | null; map: string | null; mode: GameMode | null };
}) {
  return (
    <form method="get" action="/drafts" className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-xs text-muted-foreground">
        Event
        <select name="event" defaultValue={selected.eventId ?? ""} className={FIELD}>
          <option value="">All recorded events</option>
          {options.events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        Mode
        <select name="mode" defaultValue={selected.mode ?? ""} className={FIELD}>
          <option value="">All modes</option>
          {options.modes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        Map
        <select name="map" defaultValue={selected.map ?? ""} className={FIELD}>
          <option value="">All maps</option>
          {options.maps.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="h-9 rounded-md bg-secondary px-3 text-sm font-medium hover:bg-accent"
      >
        Apply
      </button>
      <a
        href="/drafts"
        className="h-9 px-2 text-sm leading-9 text-muted-foreground hover:text-foreground"
      >
        Reset
      </a>
    </form>
  );
}
