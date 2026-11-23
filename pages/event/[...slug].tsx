import { useState } from "react";

import { NotFoundGlitch } from "@/components/motion/not-found";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/motion/tabs";
import { participantsOf } from "@/domain/participants";
import { matchesOfEvent } from "@/domain/scope";
import { defaultStageTab, groupDays, stagePhase, visibleTab } from "@/domain/stagePhase";
import { groupTables } from "@/domain/standings";
import { AppShell } from "@/ui/AppShell";
import { Bracket } from "@/ui/Bracket";
import { DayHeading, UNDATED_DAY_LABEL } from "@/ui/DayHeading";
import { EventParticipants, PrizeDistribution } from "@/ui/EventPrizes";
import { EventIcon } from "@/ui/EventRow";
import { GroupStage } from "@/ui/GroupStage";
import { MatchCard } from "@/ui/MatchCard";
import { RegionLead } from "@/ui/RegionTag";
import { dayKey, formatShortRange, groupByDay, useHydrated } from "@/ui/time";
import { useLiveSnapshot } from "@/ui/useLiveSnapshot";

import type { Props } from "./[...slug].server";

export default function EventPage({ snapshot: initial, eventId }: Props) {
  const { snapshot, connection, now } = useLiveSnapshot(initial, { event: eventId ?? undefined });
  const hydrated = useHydrated();
  const [picked, setPicked] = useState<{ eventId: string | null; tab: string } | null>(null);
  const event = snapshot.events.find((e) => e.id === eventId);

  if (!event) {
    return (
      <AppShell snapshot={snapshot} connection={connection} now={now}>
        <NotFoundGlitch
          title="Event not found"
          homeLabel="Back to matches"
          browseHref="/events"
          browseLabel="Browse events"
        />
      </AppShell>
    );
  }

  const matches = matchesOfEvent(snapshot, event.id);
  const participants = participantsOf(matches);
  const playoffs = matches.filter((m) => m.phase === "Playoffs");
  const groups = matches.filter((m) => m.phase !== "Playoffs");
  const upper = playoffs.filter((m) => /upper/i.test(m.round));
  const lower = playoffs.filter((m) => /lower/i.test(m.round));
  const finals = playoffs.filter((m) => !/upper|lower/i.test(m.round));
  const eventGroups = snapshot.groups.filter((g) => g.eventId === event.id);
  const tables = groupTables(eventGroups, matches, now);
  const phase = stagePhase(matches, now, tables);
  const seeded = playoffs.some((m) => m.team1 || m.team2);

  const tabs = [
    ...(playoffs.length > 0 ? ["playoffs"] : []),
    ...(groups.length > 0 ? ["groups"] : []),
  ];

  const wanted = defaultStageTab(phase, seeded);

  const tab = visibleTab(
    picked?.eventId === event.id ? picked.tab : null,
    tabs,
    tabs.includes(wanted) ? wanted : (tabs[0] ?? wanted),
  );

  const { days, current } = groupDays(groups, now, hydrated ? dayKey : undefined);

  const dayNumber =
    phase === "groups" && /^Day \d+$/.test(current ?? "") ? current?.toLowerCase() : null;

  return (
    <AppShell snapshot={snapshot} connection={connection} now={now}>
      <div className="mb-8 flex items-center gap-4">
        <EventIcon event={event} size={56} />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <RegionLead event={event} />
            {eventGroups.length > 0 && dayNumber && (
              <>
                <span>
                  Group stage, {dayNumber} of {days.length}
                </span>
                <span aria-hidden>·</span>
              </>
            )}
            <span>{formatShortRange(event.startDate, event.endDate)}</span>
            {event.prizePoolUsd ? (
              <>
                <span aria-hidden>·</span>
                <span className="tabular-nums">${event.prizePoolUsd.toLocaleString("en-US")}</span>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <a
              href={event.liquipediaUrl}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              Liquipedia<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setPicked({ eventId: event.id, tab: value })}
        variant="segment"
      >
        <TabsList aria-label="Phase" className="mb-6">
          {playoffs.length > 0 && (
            <TabsTrigger
              value="playoffs"
              className="focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              Playoffs
            </TabsTrigger>
          )}
          {groups.length > 0 && (
            <TabsTrigger
              value="groups"
              className="focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              Group stage
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="playoffs">
          <div className="space-y-10">
            <Bracket
              title="Upper bracket"
              matches={upper}
              event={event}
              snapshot={snapshot}
              now={now}
            />
            <Bracket
              title="Lower bracket"
              matches={lower}
              event={event}
              snapshot={snapshot}
              now={now}
            />
            <Bracket title="Finals" matches={finals} event={event} snapshot={snapshot} now={now} />
          </div>
        </TabsContent>

        <TabsContent value="groups">
          {eventGroups.length > 0 ? (
            <GroupStage
              key={event.id}
              event={event}
              tables={tables}
              matches={matches}
              snapshot={snapshot}
              now={now}
              phase={phase}
            />
          ) : (
            <div className="space-y-6">
              {groupByDay(groups, (m) => m.startsAt, hydrated).map((group) => (
                <div key={group.key} className="space-y-3">
                  <DayHeading
                    date={group.date}
                    now={now}
                    undatedLabel={group.key === "tbd" ? UNDATED_DAY_LABEL : undefined}
                  />
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {group.items.map((m) => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        event={event}
                        snapshot={snapshot}
                        now={now}
                        footer="round"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-10 space-y-10">
        <PrizeDistribution event={event} snapshot={snapshot} />
        <EventParticipants teams={participants} snapshot={snapshot} />
      </div>
    </AppShell>
  );
}
