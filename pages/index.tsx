import { useMemo, useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";
import {
  type EventPhase,
  type HomeView,
  homeViewSearch,
  isEventPhase,
  isHomeRegion,
  isListTab,
  type ListTab,
} from "@/domain/homeView";
import { matchState } from "@/domain/matchState";
import type { IgniteEvent, Match } from "@/domain/model";
import { AppShell } from "@/ui/AppShell";
import { DayHeading } from "@/ui/DayHeading";
import { EventRow, eventPhase } from "@/ui/EventRow";
import { MatchCard } from "@/ui/MatchCard";
import { REGION_FILTERS, regionKey, type RegionFilter } from "@/ui/region";
import { dayKey, groupByDay, useHydrated } from "@/ui/time";
import { UnderlineTabsTrigger } from "@/ui/UnderlineTabsTrigger";
import { useLiveSnapshot } from "@/ui/useLiveSnapshot";

import type { Props } from "./index.server";

const UPCOMING_LIMIT = 30;
const RESULTS_LIMIT = 36;

function inRegion(event: IgniteEvent | undefined, region: RegionFilter) {
  return region === "all" || regionKey(event?.region) === region;
}

function smartDefaultTab(live: Match[], upcoming: Match[], results: Match[], now: number): ListTab {
  if (live.length > 0) return "upcoming";
  const today = dayKey(new Date(now).toISOString());
  const playedToday = results.some((m) => m.startsAt && dayKey(m.startsAt) === today);
  const moreToday = upcoming.some((m) => m.startsAt && dayKey(m.startsAt) === today);

  return playedToday && !moreToday ? "results" : "upcoming";
}

/**
 * Records the tabs in the current entry's query, so back from a match returns to them. It runs
 * only from tab clicks: an effect could fire before the router has pushed a new entry and
 * rewrite the previous one. Replacing rather than pushing keeps tabs out of the back stack, and
 * keeping history.state keeps the router's scroll key. The router's own record of the URL keeps
 * the old query; nothing here reads it.
 */
function rememberView(view: HomeView) {
  const url = window.location.pathname + homeViewSearch(view) + window.location.hash;

  window.history.replaceState(window.history.state, "", url);
}

export default function HomePage({ snapshot: initial, view }: Props) {
  const { snapshot, connection, now } = useLiveSnapshot(initial);
  const hydrated = useHydrated();
  const [region, setRegion] = useState<RegionFilter>(view.region);

  const [chosenTab, setChosenTab] = useState<ListTab | null>(view.tab);

  const [eventTab, setEventTab] = useState<EventPhase>(view.events);
  const [loadedView, setLoadedView] = useState(view);

  // Void keeps this component mounted between two home entries, so back, forward or the logo link
  // bring a new view without a remount. Every navigation builds new props, so a new object means
  // the URL changed, even when tab clicks had already rewritten it to the same query.
  if (view !== loadedView) {
    setLoadedView(view);
    setRegion(view.region);
    setChosenTab(view.tab);
    setEventTab(view.events);
  }

  const events = useMemo(() => new Map(snapshot.events.map((e) => [e.id, e])), [snapshot.events]);

  const { live, upcoming, results } = useMemo(() => {
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
      results: byStatus.finished.toReversed(),
    };
  }, [snapshot.matches, events, region, now]);

  const fallbackTab = hydrated ? smartDefaultTab(live, upcoming, results, now) : "upcoming";
  const tab = chosenTab ?? fallbackTab;

  const nextUp = upcoming.find((m) => m.team1 && m.team2) ?? upcoming[0];

  const shown =
    tab === "upcoming" ? upcoming.slice(0, UPCOMING_LIMIT) : results.slice(0, RESULTS_LIMIT);

  const sidebarEvents = snapshot.events.filter(
    (e) => inRegion(e, region) && eventPhase(e, now) === eventTab,
  );

  const card = (m: Match) => (
    <MatchCard key={m.id} match={m} event={events.get(m.eventId)} snapshot={snapshot} now={now} />
  );

  return (
    <AppShell snapshot={snapshot} connection={connection} now={now}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Matches</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Marvel Rivals Ignite: live series, schedule and results.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              value={tab}
              onValueChange={(v) => {
                if (!isListTab(v)) return;
                setChosenTab(v);
                rememberView({ region, tab: v, events: eventTab });
              }}
              variant="segment"
            >
              <TabsList aria-label="Show" className="rounded-xl p-1 ring-1 ring-border ring-inset">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="results">Results</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
              <Tabs
                value={region}
                onValueChange={(v) => {
                  if (!isHomeRegion(v)) return;
                  setRegion(v);
                  rememberView({ region: v, tab: chosenTab, events: eventTab });
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
          </div>

          {live.length > 0 && (
            <section aria-labelledby="live-heading" className="space-y-3">
              <h2 id="live-heading" className="flex items-center gap-2 text-sm font-semibold">
                <span className="live-dot size-2 rounded-full bg-live" aria-hidden />
                Live now
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{live.map(card)}</div>
            </section>
          )}

          {tab === "results" && nextUp && (
            <section aria-labelledby="next-heading" className="space-y-3">
              <h2 id="next-heading" className="text-sm font-semibold">
                Next up
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{card(nextUp)}</div>
            </section>
          )}

          <section
            aria-label={tab === "upcoming" ? "Upcoming matches" : "Results"}
            className="space-y-6"
          >
            {shown.length === 0 && (
              <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                {tab === "upcoming"
                  ? "Nothing scheduled in this region yet. Check Results for the latest series."
                  : "No results in this region yet."}
              </p>
            )}
            {groupByDay(shown, (m) => m.startsAt, hydrated).map((group) => (
              <div key={group.key} className="space-y-3">
                <DayHeading date={group.date} now={now} />
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.items.map(card)}
                </div>
              </div>
            ))}
          </section>
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
              rememberView({ region, tab: chosenTab, events: v });
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
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
