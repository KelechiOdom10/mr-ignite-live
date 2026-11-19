import { Link } from "@void/react";
import { useMemo, useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";
import { eventPhase, nextEvent } from "@/domain/eventPhase";
import {
  type EventPhase,
  isEventPhase,
  isRegionFilter,
  type MatchesView,
  matchesHref,
  matchesViewSearch,
} from "@/domain/matchesView";
import { matchState } from "@/domain/matchState";
import type { IgniteEvent, Match } from "@/domain/model";
import { AppShell } from "@/ui/AppShell";
import { EventRow } from "@/ui/EventRow";
import { MatchCard } from "@/ui/MatchCard";
import { REGION_FILTERS, regionKey, type RegionFilter } from "@/ui/region";
import { UnderlineTabsTrigger } from "@/ui/UnderlineTabsTrigger";
import { useLiveSnapshot } from "@/ui/useLiveSnapshot";

import type { Props } from "./index.server";

const SUMMARY_LIMIT = 6;

function inRegion(event: IgniteEvent | undefined, region: RegionFilter) {
  return region === "all" || regionKey(event?.region) === region;
}

/**
 * Records the region and event tabs in the current entry's query, so back from a match returns to
 * them. It runs only from tab clicks: an effect could fire before the router has pushed a new
 * entry and rewrite the previous one. Replacing rather than pushing keeps tabs out of the back
 * stack, and keeping history.state keeps the router's scroll key.
 */
function rememberView(view: MatchesView) {
  const url = window.location.pathname + matchesViewSearch(view) + window.location.hash;

  window.history.replaceState(window.history.state, "", url);
}

function SeeAll({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      See all
    </Link>
  );
}

export default function HomePage({ snapshot: initial, view }: Props) {
  const { snapshot, connection, now } = useLiveSnapshot(initial);
  const [region, setRegion] = useState<RegionFilter>(view.region);
  const [eventTab, setEventTab] = useState<EventPhase>(view.events);
  const [loadedView, setLoadedView] = useState(view);

  // Void keeps this component mounted between two home entries, so back, forward or the logo link
  // bring a new view without a remount. Every navigation builds new props, so a new object means
  // the URL changed, even when tab clicks had already rewritten it to the same query.
  if (view !== loadedView) {
    setLoadedView(view);
    setRegion(view.region);
    setEventTab(view.events);
  }

  const events = useMemo(() => new Map(snapshot.events.map((e) => [e.id, e])), [snapshot.events]);

  const { live, upcoming, undated, results } = useMemo(() => {
    const byStatus: Record<"live" | "upcoming" | "finished", Match[]> = {
      live: [],
      upcoming: [],
      finished: [],
    };

    for (const m of snapshot.matches) {
      if (inRegion(events.get(m.eventId), region)) byStatus[matchState(m, now).status].push(m);
    }

    return {
      live: byStatus.live,
      upcoming: byStatus.upcoming.filter((m) => m.startsAt),
      undated: byStatus.upcoming.filter((m) => !m.startsAt),
      results: byStatus.finished.toReversed(),
    };
  }, [snapshot.matches, events, region, now]);

  const regionEvents = snapshot.events.filter((e) => inRegion(e, region));
  const sidebarEvents = regionEvents.filter((e) => eventPhase(e, now) === eventTab);

  const upNext =
    eventTab === "ongoing" && sidebarEvents.length === 0 ? nextEvent(regionEvents, now) : undefined;

  const card = (m: Match) => (
    <MatchCard key={m.id} match={m} event={events.get(m.eventId)} snapshot={snapshot} now={now} />
  );

  const matchesUrl = (tab: MatchesView["tab"]) => matchesHref({ region, tab });

  const nothing =
    live.length === 0 && upcoming.length === 0 && undated.length === 0 && results.length === 0;

  return (
    <AppShell snapshot={snapshot} connection={connection} now={now}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Matches</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Marvel Rivals Ignite: live series, schedule and results.
            </p>
          </div>

          <div className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
            <Tabs
              value={region}
              onValueChange={(v) => {
                if (!isRegionFilter(v)) return;
                setRegion(v);
                rememberView({ ...view, region: v, events: eventTab });
              }}
              variant="underline"
            >
              <TabsList aria-label="Region">
                {REGION_FILTERS.map((r) => (
                  <UnderlineTabsTrigger key={r.value} value={r.value}>
                    {r.label}
                  </UnderlineTabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {nothing && (
            <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              No matches are available in this region.{" "}
              <Link href="/events" className="text-foreground underline">
                Browse events
              </Link>
              .
            </p>
          )}

          {live.length > 0 && (
            <section aria-labelledby="live-heading" className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="live-heading" className="flex items-center gap-2 text-sm font-semibold">
                  <span className="live-dot size-2 rounded-full bg-live" aria-hidden />
                  Live now
                </h2>
                <SeeAll href={matchesUrl(null)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{live.map(card)}</div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section aria-labelledby="next-heading" className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="next-heading" className="text-sm font-semibold">
                  Next up
                </h2>
                <SeeAll href={matchesUrl(null)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {upcoming.slice(0, SUMMARY_LIMIT).map(card)}
              </div>
            </section>
          )}

          {results.length > 0 && (
            <section aria-labelledby="results-heading" className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="results-heading" className="text-sm font-semibold">
                  Latest results
                </h2>
                <SeeAll href={matchesUrl("results")} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {results.slice(0, SUMMARY_LIMIT).map(card)}
              </div>
            </section>
          )}

          {undated.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Upcoming series have no confirmed dates yet.{" "}
              <Link href={matchesUrl("upcoming")} className="text-foreground underline">
                View upcoming series
              </Link>
              .
            </p>
          )}
        </div>

        <aside aria-labelledby="events-heading" className="space-y-3">
          <h2 id="events-heading" className="text-lg font-semibold">
            Events
          </h2>
          <Tabs
            value={eventTab}
            onValueChange={(v) => {
              if (!isEventPhase(v)) return;
              setEventTab(v);
              rememberView({ ...view, region, events: v });
            }}
            variant="segment"
          >
            <TabsList
              aria-label="Event status"
              className="rounded-xl p-1 ring-1 ring-border ring-inset"
            >
              <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="space-y-2">
            {sidebarEvents.length === 0 && (
              <p className="px-1 text-sm text-muted-foreground">No {eventTab} events.</p>
            )}
            {sidebarEvents.map((e) => (
              <EventRow
                key={e.id}
                event={e}
                matches={snapshot.matches.filter((m) => m.eventId === e.id)}
                now={now}
              />
            ))}
            {upNext && (
              <>
                <h3 className="px-1 pt-2 text-xs font-medium text-muted-foreground">Next event</h3>
                <EventRow event={upNext} matches={[]} now={now} />
              </>
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
