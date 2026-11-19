import { SlidersHorizontal, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import type { EventOption, TeamOption } from "@/domain/matchesOptions";
import type { MatchesView } from "@/domain/matchesView";
import { cn } from "@/lib/utils";

import { filterChips } from "./filterChips";
import { ResultsFilter, type ResultFilterChange } from "./ResultsFilter";

export function ResultsFilterDisclosure({
  view,
  events,
  teams,
  onChange,
  onClear,
}: {
  view: MatchesView;
  events: readonly EventOption[];
  teams: readonly TeamOption[];
  onChange: (change: ResultFilterChange) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const chips = filterChips(view, events, teams);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 sm:hidden">
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-foreground/20"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filters
          {chips.length > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
              {chips.length}
            </span>
          )}
        </button>
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            aria-label={`Remove filter ${chip.label}`}
            onClick={() => {
              onChange(chip.clear);
              toggleRef.current?.focus();
            }}
            className="inline-flex h-9 max-w-full items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-medium outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-foreground/20"
          >
            <span className="truncate">{chip.label}</span>
            <X className="size-3.5 shrink-0" aria-hidden />
          </button>
        ))}
      </div>
      <div id={panelId} className={cn(!open && "hidden", "sm:block")}>
        <ResultsFilter
          view={view}
          events={events}
          teams={teams}
          onChange={onChange}
          onClear={onClear}
        />
      </div>
    </div>
  );
}
