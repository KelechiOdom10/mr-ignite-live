import { useState } from "react";

import { Tabs, TabsList } from "@/components/motion/tabs";
import { PLAYOFFS } from "@/domain/bracket";
import { matchState } from "@/domain/matchState";
import type { Group, IgniteEvent, Match, Snapshot } from "@/domain/model";
import { groupDays, type StagePhase } from "@/domain/stagePhase";
import { containerOf, GROUP_STAGE, groupTables } from "@/domain/standings";
import { cn } from "@/lib/utils";

import { MatchCard } from "./MatchCard";
import { useSpoilersHidden } from "./spoilers";
import { StandingsPanel } from "./Standings";
import { dayKey, formatDate, formatTime, useHydrated } from "./time";
import { UnderlineTabsTrigger } from "./UnderlineTabsTrigger";

function LiveNote({ match, now }: { match: Match; now: number }) {
  const hidden = useSpoilersHidden();
  const state = matchState(match, now);

  if (hidden || !match.team1 || !match.team2) return null;

  const [a, b] = [state.wins1, state.wins2];
  const leader = a > b ? match.team1.name : b > a ? match.team2.name : null;

  return (
    <p className="mt-2 text-xs text-muted-foreground">
      {leader
        ? `${leader} lead ${Math.max(a, b)}-${Math.min(a, b)} on maps.`
        : `Level at ${a}-${b} on maps.`}{" "}
      It counts in the table when the series ends.
    </p>
  );
}

export function GroupStage({
  event,
  groups,
  matches,
  snapshot,
  now,
  phase,
}: {
  event: IgniteEvent;
  groups: Group[];
  matches: Match[];
  snapshot: Snapshot;
  now: number;
  phase: StagePhase;
}) {
  const hydrated = useHydrated();
  const stage = matches.filter((m) => m.phase === GROUP_STAGE);
  const { days, current } = groupDays(stage, now);
  const [picked, setPicked] = useState<string | null>(null);
  const day = picked ?? current;
  const live = stage.filter((m) => matchState(m, now).status === "live");
  const tables = groupTables(groups, matches, now);

  const dayMatches = stage.filter((m) => m.round === day);
  const first = dayMatches.flatMap((m) => (m.startsAt ? [m.startsAt] : [])).sort()[0];

  const isToday =
    hydrated && first !== undefined && dayKey(first) === dayKey(new Date(now).toISOString());

  const card = (m: Match) => (
    <MatchCard key={m.id} match={m} event={event} snapshot={snapshot} now={now} footer="time" />
  );

  const playoffsStart =
    phase === "between"
      ? matches.flatMap((m) => (m.phase === PLAYOFFS && m.startsAt ? [m.startsAt] : [])).sort()[0]
      : undefined;

  return (
    <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_1fr] lg:items-start">
      {live.length > 0 && (
        <section aria-labelledby="live-now" className="min-w-0 lg:col-start-1">
          <h2 id="live-now" className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <span className="live-dot size-2 rounded-full bg-live" aria-hidden />
            Live now
          </h2>
          <div className="grid max-w-sm gap-4">
            {live.map((m) => (
              <div key={m.id}>
                {card(m)}
                <LiveNote match={m} now={now} />
              </div>
            ))}
          </div>
        </section>
      )}

      {tables.length > 0 && (
        <section
          aria-labelledby="standings"
          className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1"
        >
          <h2 id="standings" className="mb-3 text-base font-semibold">
            Standings
          </h2>
          {phase !== "groups" && (
            <div className="mb-3 rounded-xl border bg-card px-3 py-2.5 text-sm">
              <p className="font-medium">Group stage finished</p>
              {playoffsStart && hydrated && (
                <p className="text-xs text-muted-foreground">
                  Playoffs start {formatDate(playoffsStart)}, {formatTime(playoffsStart)}
                </p>
              )}
            </div>
          )}
          <StandingsPanel tables={tables} snapshot={snapshot} now={now} />
        </section>
      )}

      <section aria-labelledby="group-matches" className="min-w-0 space-y-4 lg:col-start-1">
        <h2 id="group-matches" className="flex items-center gap-2 text-base font-semibold">
          Matches
          {isToday && (
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Today
            </span>
          )}
        </h2>
        {days.length > 1 && day && (
          <div className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
            <Tabs value={day} onValueChange={setPicked} variant="underline">
              <TabsList aria-label="Day">
                {days.map((d) => (
                  <UnderlineTabsTrigger key={d} value={d} className="min-h-11">
                    {d}
                  </UnderlineTabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}
        <div className="grid gap-6 sm:grid-cols-2">
          {groups.map((g) => {
            const list = dayMatches
              .filter((m) => g.matchGroups.includes(containerOf(m)))
              .toSorted((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));

            return (
              <div key={g.title} className={cn("min-w-0 space-y-3", list.length === 0 && "hidden")}>
                <h3 className="text-sm font-semibold">{g.title}</h3>
                <div className="grid gap-3">{list.map(card)}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
