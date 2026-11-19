import { useMemo, useState } from "react";

import { Button } from "@/components/motion/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";
import {
  hasResultFilters,
  isListTab,
  isRegionFilter,
  type ListTab,
  type MatchesView,
  matchesViewSearch,
  type ResultRange,
  smartDefaultTab,
  splitBracketSlots,
  upcomingSeries,
  withListTab,
} from "@/domain/matchesView";
import { matchState } from "@/domain/matchState";
import type { IgniteEvent, Match } from "@/domain/model";
import { AppShell } from "@/ui/AppShell";
import { DayHeading, UNDATED_DAY_LABEL } from "@/ui/DayHeading";
import { filterResults } from "@/ui/filterResults";
import { MatchCard } from "@/ui/MatchCard";
import { REGION_FILTERS, type RegionFilter, regionKey } from "@/ui/region";
import type { ResultFilterChange } from "@/ui/ResultsFilter";
import { ResultsFilterDisclosure } from "@/ui/ResultsFilterDisclosure";
import { groupByDay, useHydrated } from "@/ui/time";
import { UnderlineTabsTrigger } from "@/ui/UnderlineTabsTrigger";
import { useLiveSnapshot } from "@/ui/useLiveSnapshot";

import type { Props } from "./matches.server";

const UPCOMING_LIMIT = 30;
const RESULTS_LIMIT = 36;

function inRegion(event: IgniteEvent | undefined, region: RegionFilter) {
  return region === "all" || regionKey(event?.region) === region;
}

/**
 * Records the tabs and filters in the current entry's query, so back from a match returns to them.
 * It runs only from clicks: an effect could fire before the router has pushed a new entry and
 * rewrite the previous one. Replacing rather than pushing keeps filters out of the back stack, and
 * keeping history.state keeps the router's scroll key.
 */
function rememberView(view: MatchesView) {
  const url = window.location.pathname + matchesViewSearch(view) + window.location.hash;

  window.history.replaceState(window.history.state, "", url);
}

export default function MatchesPage({
  snapshot: initial,
  view,
  events: eventOptions,
  teams: teamOptions,
}: Props) {
  const [region, setRegion] = useState<RegionFilter>(view.region);
  const [chosenTab, setChosenTab] = useState<ListTab | null>(view.tab);
  const [event, setEvent] = useState<string | null>(view.event);
  const [team, setTeam] = useState<string | null>(view.team);
  const [range, setRange] = useState<ResultRange>(view.range);
  const [loadedView, setLoadedView] = useState(view);

  const { snapshot, connection, now } = useLiveSnapshot(initial, {
    view: "matches",
    event: event ?? undefined,
    team: team ?? undefined,
  });

  const hydrated = useHydrated();

  // Void keeps this component mounted between two matches entries, so back, forward or the logo
  // link bring a new view without a remount. Every navigation builds new props, so a new object
  // means the URL changed, even when clicks had already rewritten it to the same query.
  if (view !== loadedView) {
    setLoadedView(view);
    setRegion(view.region);
    setChosenTab(view.tab);
    setEvent(view.event);
    setTeam(view.team);
    setRange(view.range);
  }

  const events = useMemo(() => new Map(snapshot.events.map((e) => [e.id, e])), [snapshot.events]);

  const filters = useMemo(
    () => ({ region, tab: chosenTab, events: view.events, event, team, range }),
    [region, chosenTab, event, team, range, view.events],
  );

  const { live, upcoming, results } = useMemo(() => {
    const liveMatches: Match[] = [];
    const upcomingMatches: Match[] = [];

    for (const m of snapshot.matches) {
      if (!inRegion(events.get(m.eventId), region)) continue;

      const status = matchState(m, now).status;

      if (status === "live") liveMatches.push(m);
      else if (status === "upcoming") upcomingMatches.push(m);
    }

    return {
      live: liveMatches,
      upcoming: upcomingSeries(upcomingMatches, UPCOMING_LIMIT),
      results: filterResults(snapshot.matches, events, filters, now),
    };
  }, [snapshot.matches, events, filters, region, now]);

  const fallbackTab = hydrated ? smartDefaultTab(live, upcoming, results, now) : "upcoming";
  const tab = chosenTab ?? fallbackTab;
  const nextUp = upcoming.find((m) => m.team1 && m.team2) ?? upcoming[0];
  const narrower = hasResultFilters(filters);

  const shown =
    tab === "upcoming" ? upcoming : narrower ? results : results.slice(0, RESULTS_LIMIT);

  const card = (m: Match) => (
    <MatchCard key={m.id} match={m} event={events.get(m.eventId)} snapshot={snapshot} now={now} />
  );

  const update = (change: ResultFilterChange) => {
    const nextEvent = change.event === undefined ? event : change.event;
    const nextTeam = change.team === undefined ? team : change.team;
    const next = { ...filters, event: nextEvent, team: nextTeam, range: change.range ?? range };

    setEvent(nextEvent);
    setTeam(nextTeam);
    setRange(next.range);
    rememberView(next);
  };

  const clear = () => update({ event: null, team: null, range: "any" });

  return (
    <AppShell snapshot={snapshot} connection={connection} now={now}>
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
              const next = withListTab(filters, v);

              setChosenTab(v);
              setEvent(next.event);
              setTeam(next.team);
              setRange(next.range);
              rememberView(next);
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
                if (!isRegionFilter(v)) return;
                setRegion(v);
                rememberView({ ...filters, region: v });
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

        {tab === "results" && (
          <ResultsFilterDisclosure
            view={filters}
            events={eventOptions}
            teams={teamOptions}
            onChange={update}
            onClear={clear}
          />
        )}

        {live.length > 0 && (
          <section aria-labelledby="live-heading" className="space-y-3">
            <h2 id="live-heading" className="flex items-center gap-2 text-sm font-semibold">
              <span className="live-dot size-2 rounded-full bg-live" aria-hidden />
              Live now
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{live.map(card)}</div>
          </section>
        )}

        <section
          aria-label={tab === "upcoming" ? "Upcoming matches" : "Results"}
          className="space-y-6"
        >
          {shown.length === 0 && tab === "results" && narrower && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              <p>No results match these filters.</p>
              <Button variant="outline" size="sm" onClick={clear}>
                Clear
              </Button>
            </div>
          )}
          {shown.length === 0 && (tab === "upcoming" || !narrower) && (
            <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              {tab === "upcoming"
                ? "Nothing scheduled in this region yet. Check Results for the latest series."
                : "No results in this region yet."}
            </p>
          )}
          {groupByDay(shown, (m) => m.startsAt, hydrated).map((group) => {
            const slots =
              tab === "upcoming" && group.key === "tbd" ? splitBracketSlots(group.items) : null;

            const sections =
              slots && slots.known.length > 0 && slots.awaiting.length > 0
                ? [
                    { label: "Known matchups", items: slots.known },
                    { label: "Bracket slots awaiting teams", items: slots.awaiting },
                  ]
                : [{ label: null, items: group.items }];

            return (
              <div key={group.key} className="space-y-3">
                <DayHeading
                  date={group.date}
                  now={now}
                  undatedLabel={group.key === "tbd" ? UNDATED_DAY_LABEL : undefined}
                />
                {sections.map((section) => (
                  <div key={section.label ?? "all"} className="space-y-3">
                    {section.label && (
                      <h4 className="text-xs font-medium text-muted-foreground">
                        {section.label} ({section.items.length})
                      </h4>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {section.items.map(card)}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </section>

        {tab === "results" && !narrower && nextUp && (
          <section aria-labelledby="next-heading" className="space-y-3">
            <h2 id="next-heading" className="text-sm font-semibold">
              Next up
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{card(nextUp)}</div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
