import { useEffect, useRef, useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/motion/select";
import type { EventOption } from "@/domain/matchesOptions";
import { cn } from "@/lib/utils";

import { searchEvents } from "./searchEvents";

const ANY = "__any";

export function EventSelect({
  value,
  events,
  onChange,
  className,
}: {
  value: string | null;
  events: readonly EventOption[];
  onChange: (event: string | null) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const fieldRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const name = value === null ? "All events" : (events.find((e) => e.id === value)?.name ?? value);
  const found = searchEvents(events, query);
  const matches = found.filter((event) => event.id !== value);
  const searching = query.trim() !== "";

  const focusTrigger = () => fieldRef.current?.querySelector<HTMLElement>("button")?.focus();

  useEffect(() => {
    if (open && window.matchMedia("(hover: hover)").matches) searchRef.current?.focus();
  }, [open]);

  return (
    <div
      ref={fieldRef}
      className={className}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) focusTrigger();
      }}
    >
      <Select
        value={value ?? ANY}
        open={open}
        onOpenChange={(next) => {
          setOpen(next);

          if (!next) setQuery("");
        }}
        onValueChange={(next) => {
          onChange(next === ANY ? null : next);
          focusTrigger();
        }}
      >
        <SelectTrigger>
          <span className="sr-only">Event</span>
          <span className={cn("min-w-0 truncate", value === null && "text-muted-foreground")}>
            {name}
          </span>
        </SelectTrigger>
        <SelectContent className="sm:right-auto sm:w-[22rem]">
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events"
            aria-label="Search events"
            className="mb-1 h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
          />
          <SelectItem value={value ?? ANY}>
            <span className="line-clamp-2 min-w-0" title={name}>
              {name}
            </span>
          </SelectItem>
          <div className="max-h-[min(20rem,40dvh)] overflow-y-auto">
            {value !== null && !searching && (
              <SelectItem value={ANY}>
                <span>All events</span>
              </SelectItem>
            )}
            {matches.map((event) => (
              <SelectItem key={event.id} value={event.id}>
                <span className="line-clamp-2 min-w-0" title={event.name}>
                  {event.name}
                </span>
              </SelectItem>
            ))}
          </div>
          {searching && (
            <p role="status" className="px-2.5 py-1.5 text-xs text-muted-foreground">
              {found.length === 0
                ? "No events match that search."
                : `${found.length} of ${events.length} events`}
            </p>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
