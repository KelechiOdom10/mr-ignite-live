import { Link } from "@void/react";

import { matchState } from "@/domain/matchState";
import type { SideView } from "@/domain/matchView";
import type { Match, Snapshot } from "@/domain/model";
import { cn } from "@/lib/utils";

import { RegionTag } from "./RegionTag";
import { useMatchView } from "./spoilers";
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
  const view = useMatchView(match, now);
  const event = snapshot.events.find((e) => e.id === match.eventId);
  const row = (side: SideView) => (
    <div
      className={cn("flex items-center gap-2", side.outcome === "lost" && "text-muted-foreground")}
    >
      <TeamLogo
        team={side.team}
        info={side.team ? snapshot.teams[side.team.name] : undefined}
        size={16}
      />
      <span className="min-w-0 flex-1 truncate text-xs font-medium" title={side.name}>
        {side.short}
      </span>
      <span className="font-mono text-xs tabular-nums">{side.score ?? ""}</span>
    </div>
  );
  return (
    <Link
      href={`/match/${match.id}`}
      aria-label={view.summary}
      className={cn(
        "flex w-44 shrink-0 snap-start flex-col gap-1.5 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-accent",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <StatusLabel match={match} view={view} now={now} className="text-[0.7rem]" />
        <RegionTag event={event} />
      </div>
      {row(view.side1)}
      {row(view.side2)}
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
