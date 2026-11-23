import { useState } from "react";

import { Tabs, TabsList } from "@/components/motion/tabs";
import { PLAYOFFS } from "@/domain/bracket";
import { matchState } from "@/domain/matchState";
import type { IgniteEvent, Match, Snapshot } from "@/domain/model";
import { byKickoff, groupDays, type StagePhase, visibleTab } from "@/domain/stagePhase";
import { type GroupTable, inRankedTable, splitByGroup } from "@/domain/standings";

import { MatchCard } from "./MatchCard";
import { useMatchView } from "./spoilers";
import { StandingsPanel } from "./Standings";
import { dayKey, formatDate, formatTime, useHydrated } from "./time";
import { UnderlineTabsTrigger } from "./UnderlineTabsTrigger";

function LiveNote({
  match,
  now,
  matches,
  counts,
}: {
  match: Match;
  now: number;
  matches: readonly Match[];
  counts: boolean;
}) {
  const { side1, side2, revealed } = useMatchView(match, now, matches);

  if (!revealed || !match.team1 || !match.team2) return null;

  const [a, b] = [side1.score ?? 0, side2.score ?? 0];
  const leader = a > b ? side1.name : b > a ? side2.name : null;

  return (
    <p className="mt-2 text-xs text-muted-foreground">
      {leader
        ? `${leader} lead ${Math.max(a, b)}-${Math.min(a, b)} on maps.`
        : `Level at ${a}-${b} on maps.`}{" "}
      {counts && "It counts in the table when the series ends."}
    </p>
  );
}

export function GroupStage({
  event,
  tables,
  matches,
  snapshot,
  now,
  phase,
}: {
  event: IgniteEvent;
  tables: GroupTable[];
  matches: Match[];
  snapshot: Snapshot;
  now: number;
  phase: StagePhase;
}) {
  const hydrated = useHydrated();
  const stage = matches.filter((m) => m.phase !== PLAYOFFS);
  const { days, current, today } = groupDays(stage, now, hydrated ? dayKey : undefined);
  const [picked, setPicked] = useState<string | null>(null);
  const day = current ? visibleTab(picked, days, current) : null;
  const live = stage.filter((m) => matchState(m, now).status === "live");

  const byDay = splitByGroup(
    tables.map((t) => t.group),
    stage.filter((m) => m.round === day),
  );

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
                <LiveNote
                  match={m}
                  now={now}
                  matches={snapshot.matches}
                  counts={inRankedTable(m, tables)}
                />
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
          <StandingsPanel tables={tables} snapshot={snapshot} />
        </section>
      )}

      <section aria-labelledby="group-matches" className="min-w-0 space-y-4 lg:col-start-1">
        <h2 id="group-matches" className="flex items-center gap-2 text-base font-semibold">
          Matches
          {day && today.includes(day) && (
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
          {byDay.groups.map(({ group, matches: list }) =>
            list.length === 0 ? null : (
              <div key={group.title} className="min-w-0 space-y-3">
                <h3 className="text-sm font-semibold">{group.title}</h3>
                <div className="grid gap-3">{list.toSorted(byKickoff).map(card)}</div>
              </div>
            ),
          )}
          {byDay.other.length > 0 && (
            <div className="min-w-0 space-y-3">
              {byDay.groups.length > 0 && <h3 className="text-sm font-semibold">Other matches</h3>}
              <div className="grid gap-3">{byDay.other.toSorted(byKickoff).map(card)}</div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
