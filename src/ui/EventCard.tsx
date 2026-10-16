import { Link } from "@void/react";
import { Card, CARD_TARGET_CLASS } from "@/components/motion/card";
import { matchState, type IgniteEvent, type Match } from "@/data/model";
import { eventSlug } from "@/data/scope";
import { LiveDot } from "./MatchViews";

export function EventCard({ event, matches, now }: { event: IgniteEvent; matches: Match[]; now: number }) {
  const states = matches.map((m) => matchState(m, now));
  const done = states.filter((s) => s.status === "finished").length;
  const live = states.some((s) => s.status === "live");
  const pct = matches.length ? Math.round((done / matches.length) * 100) : 0;
  return (
    <Card interactive size="compact" className="gap-2 bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">{event.region}</span>
        {live && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-live">
            <LiveDot /> Live
          </span>
        )}
      </div>
      <Link href={`/event/${eventSlug(event.id)}`} className={`font-display text-lg font-bold uppercase leading-tight ${CARD_TARGET_CLASS}`}>
        {event.name}
      </Link>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {event.startDate} → {event.endDate}
        </span>
        {event.prizePoolUsd ? <span>${event.prizePoolUsd.toLocaleString("en-US")}</span> : null}
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted" aria-label={`${done} of ${matches.length} matches played`}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </Card>
  );
}
