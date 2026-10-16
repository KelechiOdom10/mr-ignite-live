import { useMemo, useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";
import { matchState, type IgniteEvent, type Match } from "@/data/model";
import { AppShell } from "@/ui/AppShell";
import { EventCard } from "@/ui/EventCard";
import { LiveMatchCard, MatchRow } from "@/ui/MatchViews";
import { groupByDay, useHydrated } from "@/ui/time";
import { useLiveSnapshot } from "@/ui/useLiveSnapshot";

import type { Props } from "./index.server";

const REGIONS = ["All", "Americas", "EMEA", "China", "Pacific"] as const;

function inRegion(event: IgniteEvent | undefined, region: string) {
  return region === "All" || (event?.region ?? "").startsWith(region);
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-baseline gap-2 font-display text-xl font-bold uppercase tracking-wide">
        {title}
        {count !== undefined && (
          <span className="text-sm font-semibold text-muted-foreground">{count}</span>
        )}
      </h2>
      {children}
    </section>
  );
}

export default function HomePage({ snapshot: initial }: Props) {
  const { snapshot, connection, now } = useLiveSnapshot(initial);
  const [region, setRegion] = useState<string>("All");
  const hydrated = useHydrated();
  const events = useMemo(() => new Map(snapshot.events.map((e) => [e.id, e])), [snapshot.events]);

  const { live, upcoming, results } = useMemo(() => {
    const live: Match[] = [];
    const upcoming: Match[] = [];
    const results: Match[] = [];
    for (const m of snapshot.matches) {
      if (!inRegion(events.get(m.eventId), region)) continue;
      const s = matchState(m, now).status;
      if (s === "live") live.push(m);
      else if (s === "upcoming") upcoming.push(m);
      else results.push(m);
    }
    return {
      live,
      upcoming: upcoming.filter((m) => m.startsAt).slice(0, 24),
      results: results.reverse().slice(0, 30),
    };
  }, [snapshot.matches, events, region, now]);

  const activeEvents = snapshot.events.filter(
    (e) => inRegion(e, region) && (!e.endDate || Date.parse(e.endDate) + 86_400_000 > now),
  );

  return (
    <AppShell snapshot={snapshot} connection={connection} now={now}>
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Marvel Rivals Ignite 2026
          </p>
          <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">
            Live scores
          </h1>
        </div>
        <Tabs value={region} onValueChange={setRegion}>
          <TabsList aria-label="Region">
            {REGIONS.map((r) => (
              <TabsTrigger key={r} value={r}>
                {r}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-10">
          {live.length > 0 && (
            <Section title="Live now" count={live.length}>
              <div className={live.length > 1 ? "grid gap-4 xl:grid-cols-2" : "grid gap-4"}>
                {live.map((m) => (
                  <LiveMatchCard
                    key={m.id}
                    match={m}
                    event={events.get(m.eventId)}
                    snapshot={snapshot}
                    now={now}
                  />
                ))}
              </div>
            </Section>
          )}

          <Section title="Up next">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scheduled matches in this region.</p>
            ) : (
              <div className="space-y-5">
                {groupByDay(upcoming, (m) => m.startsAt, now, hydrated).map(([day, matches]) => (
                  <div key={day} className="space-y-1">
                    <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {hydrated ? day : ""}
                    </h3>
                    {matches.map((m) => (
                      <MatchRow
                        key={m.id}
                        match={m}
                        event={events.get(m.eventId)}
                        snapshot={snapshot}
                        now={now}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Results">
            <div className="space-y-5">
              {groupByDay(results, (m) => m.startsAt, now, hydrated).map(([day, matches]) => (
                <div key={day} className="space-y-1">
                  <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {hydrated ? day : ""}
                  </h3>
                  {matches.map((m) => (
                    <MatchRow
                      key={m.id}
                      match={m}
                      event={events.get(m.eventId)}
                      snapshot={snapshot}
                      now={now}
                    />
                  ))}
                </div>
              ))}
            </div>
          </Section>
        </div>

        <aside className="space-y-3">
          <h2 className="font-display text-xl font-bold uppercase tracking-wide">Events</h2>
          {activeEvents.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              matches={snapshot.matches.filter((m) => m.eventId === e.id)}
              now={now}
            />
          ))}
        </aside>
      </div>
    </AppShell>
  );
}
