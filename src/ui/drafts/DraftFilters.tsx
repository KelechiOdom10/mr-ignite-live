import { useRouter } from "@void/react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select";
import type { GameMode } from "@/domain/maps";

import { draftHref, type DraftFilterValues } from "./draftHref";

const ALL = "all";

export interface DraftFilterOptions {
  events: { id: string; name: string }[];
  maps: string[];
  modes: readonly GameMode[];
}

function Filter({
  label,
  value,
  allLabel,
  items,
  onChange,
  className,
}: {
  label: string;
  value: string | null;
  allLabel: string;
  items: { value: string; label: string }[];
  onChange: (value: string | null) => void;
  className: string;
}) {
  return (
    // A label names the trigger button, which the vendored Select doesn't take an aria-label for.
    <label className={className}>
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : v)}>
        <SelectTrigger className="w-full">
          {/* Items register only once the list has opened, so name the current choice here. */}
          <SelectValue placeholder={items.find((i) => i.value === value)?.label ?? allLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

/** Each choice applies straight away; a map decides its mode, so picking one clears the other. */
export function DraftFilters({
  options,
  selected,
}: {
  options: DraftFilterOptions;
  selected: { eventId: string | null; map: string | null; mode: GameMode | null };
}) {
  const router = useRouter();
  const go = (next: DraftFilterValues) => void router.visit(draftHref(next));
  const filtered = selected.eventId !== null || selected.map !== null || selected.mode !== null;
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Filter
        label="Event"
        value={selected.eventId}
        allLabel="All recorded events"
        items={options.events.map((e) => ({ value: e.id, label: e.name }))}
        onChange={(eventId) => go({ ...selected, eventId })}
        className="w-full sm:w-72"
      />
      <Filter
        label="Mode"
        value={selected.mode}
        allLabel="All modes"
        items={options.modes.map((m) => ({ value: m, label: m }))}
        onChange={(mode) => go({ ...selected, mode, map: null })}
        className="w-[calc(50%-0.375rem)] sm:w-44"
      />
      <Filter
        label="Map"
        value={selected.map}
        allLabel="All maps"
        items={options.maps.map((m) => ({ value: m, label: m }))}
        onChange={(map) => go({ ...selected, map, mode: null })}
        className="w-[calc(50%-0.375rem)] sm:w-56"
      />
      {filtered && (
        <a
          href="/drafts"
          className="h-9 px-1 text-sm leading-9 text-muted-foreground hover:text-foreground"
        >
          Clear filters
        </a>
      )}
    </div>
  );
}
