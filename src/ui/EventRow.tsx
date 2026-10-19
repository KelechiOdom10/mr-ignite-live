import { Link } from "@void/react";

import { matchState } from "@/domain/matchState";
import type { IgniteEvent, Match } from "@/domain/model";
import { eventSlug } from "@/domain/scope";
import { cn } from "@/lib/utils";

import { proxiedImage } from "./images";
import { REGION_SHORT, REGION_TEXT, regionKey } from "./region";
import { LiveDot } from "./StatusLabel";
import { formatShortRange } from "./time";

export type EventPhase = "ongoing" | "upcoming" | "completed";

export function eventPhase(event: IgniteEvent, now: number): EventPhase {
  const start = event.startDate ? Date.parse(event.startDate) : Number.NaN;
  const end = event.endDate ? Date.parse(event.endDate) + 86_400_000 : Number.NaN;

  if (!Number.isNaN(start) && now < start) return "upcoming";

  if (!Number.isNaN(end) && now > end) return "completed";

  return "ongoing";
}

export function EventIcon({ event, size = 28 }: { event: IgniteEvent; size?: number }) {
  if (!event.iconUrl)
    return (
      <span
        style={{ width: size, height: size }}
        className="shrink-0 rounded-md bg-muted"
        aria-hidden
      />
    );

  return (
    <img
      src={proxiedImage(event.iconUrl)}
      alt=""
      style={{ width: size, height: size }}
      className="shrink-0 object-contain"
    />
  );
}

export function EventRow({
  event,
  matches,
  now,
}: {
  event: IgniteEvent;
  matches: Match[];
  now: number;
}) {
  const region = regionKey(event.region);
  const live = matches.some((m) => matchState(m, now).status === "live");

  return (
    <Link
      href={`/event/${eventSlug(event.id)}`}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card px-3 py-3 transition-colors hover:bg-accent",
        live && "border-live/40",
      )}
    >
      <EventIcon event={event} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium" title={event.name}>
            {event.name}
          </span>
          {live && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded bg-live/15 px-1.5 py-0.5 text-[0.65rem] font-semibold text-live uppercase">
              <LiveDot /> Live
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn("font-semibold", REGION_TEXT[region])}>{REGION_SHORT[region]}</span>
          <span aria-hidden>·</span>
          <span>{formatShortRange(event.startDate, event.endDate)}</span>
        </div>
      </div>
    </Link>
  );
}
