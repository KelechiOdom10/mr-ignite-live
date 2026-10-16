import { Link } from "@void/react";

import { matchState } from "@/domain/matchState";
import type { Match, Snapshot } from "@/domain/model";
import { cn } from "@/lib/utils";

import { REGION_EDGE, regionKey } from "./region";
import { useSpoilersHidden } from "./spoilers";
import { StatusLabel } from "./StatusLabel";
import { TeamLogo } from "./TeamMark";

const UPCOMING_CHIPS = 8;
const RESULT_CHIPS = 6;

export function stripMatches(snapshot: Snapshot, now: number): Match[] {
  const withState = snapshot.matches.map((m) => ({ m, s: matchState(m, now) }));
  const live = withState.filter(({ s }) => s.status === "live").map(({ m }) => m);
  const upcoming = withState
    .filter(({ m, s }) => s.status === "upcoming" && m.startsAt && m.team1 && m.team2)
    .slice(0, UPCOMING_CHIPS)
    .map(({ m }) => m);
  const recent = withState
    .filter(({ s }) => s.status === "finished" && s.playedMaps.length > 0)
    .slice(-RESULT_CHIPS)
    .reverse()
    .map(({ m }) => m);
  return [...live, ...upcoming, ...recent];
}

function Chip({ match, snapshot, now }: { match: Match; snapshot: Snapshot; now: number }) {
  const state = matchState(match, now);
  const hidden = useSpoilersHidden();
  const event = snapshot.events.find((e) => e.id === match.eventId);
  const showScore = state.status !== "upcoming" && !hidden;
  const row = (side: 1 | 2) => {
    const team = side === 1 ? match.team1 : match.team2;
    const wins = side === 1 ? state.wins1 : state.wins2;
    const lost = !hidden && state.winner !== 0 && state.winner !== side;
    return (
      <div className={cn("flex items-center gap-2", lost && "text-muted-foreground")}>
        <TeamLogo team={team} info={team ? snapshot.teams[team.name] : undefined} size={16} />
        <span className="min-w-0 flex-1 truncate text-xs font-medium" title={team?.name}>
          {team?.short ?? "TBD"}
        </span>
        <span className="font-mono text-xs tabular-nums">{showScore ? wins : ""}</span>
      </div>
    );
  };
  return (
    <Link
      href={`/match/${match.id}`}
      className={cn(
        "flex w-44 shrink-0 snap-start flex-col gap-1.5 rounded-lg border border-r-[3px] bg-card px-3 py-2 transition-colors hover:bg-accent",
        REGION_EDGE[regionKey(event?.region)],
      )}
    >
      <StatusLabel match={match} state={state} now={now} className="text-[0.7rem]" />
      {row(1)}
      {row(2)}
    </Link>
  );
}

export function MatchStrip({ snapshot, now }: { snapshot: Snapshot; now: number }) {
  const matches = stripMatches(snapshot, now);
  if (matches.length === 0) return null;
  return (
    <nav aria-label="Live, upcoming and recent matches" className="border-b bg-background">
      <div className="mx-auto flex max-w-7xl snap-x gap-2 overflow-x-auto px-4 py-2.5 scrollbar-none sm:px-6">
        {matches.map((m) => (
          <Chip key={m.id} match={m} snapshot={snapshot} now={now} />
        ))}
      </div>
    </nav>
  );
}
