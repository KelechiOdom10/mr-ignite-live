import { Link } from "@void/react";

import type { EventStandings } from "@/domain/homeStandings";
import type { Snapshot } from "@/domain/model";
import { eventSlug } from "@/domain/scope";
import { cn } from "@/lib/utils";

import { domId, StandingsPanel } from "./Standings";

export function HomeStandings({
  standings,
  snapshot,
  idPrefix,
  className,
}: {
  standings: EventStandings[];
  snapshot: Snapshot;
  idPrefix: string;
  className?: string;
}) {
  return (
    <>
      {standings.map(({ event, tables }) => (
        <section
          key={event.id}
          aria-labelledby={domId(idPrefix, event.id)}
          className={cn("space-y-3", className)}
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 id={domId(idPrefix, event.id)} className="text-sm font-semibold">
              {event.stage} standings
            </h2>
            <Link
              href={`/event/${eventSlug(event.id)}`}
              className="-mx-2.5 -my-3.5 px-2.5 py-3.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              See all<span className="sr-only"> {event.stage} standings</span>
            </Link>
          </div>
          <StandingsPanel
            tables={tables}
            snapshot={snapshot}
            compact
            idPrefix={domId(idPrefix, "table", event.id)}
          />
        </section>
      ))}
    </>
  );
}
