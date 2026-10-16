import { Link } from "@void/react";

import { Card, CARD_TARGET_CLASS } from "@/components/motion/card";
import { matchState, type MatchState } from "@/domain/matchState";
import type { IgniteEvent, Match, Snapshot, Team } from "@/domain/model";
import { cn } from "@/lib/utils";

import { proxiedImage } from "./images";
import { RegionTag } from "./RegionTag";
import { useSpoilersHidden } from "./spoilers";
import { StatusLabel } from "./StatusLabel";
import { TeamLogo } from "./TeamMark";

function TeamLine({
  team,
  score,
  outcome,
  snapshot,
  showScore,
}: {
  team: Team | null;
  score: number;
  outcome: "won" | "lost" | "open";
  snapshot: Snapshot;
  showScore: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <TeamLogo team={team} info={team ? snapshot.teams[team.name] : undefined} size={22} />
      <span
        title={team?.name}
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          outcome === "won" ? "font-semibold" : "font-medium",
          outcome === "lost" && "text-muted-foreground",
          !team && "text-muted-foreground",
        )}
      >
        {team?.short ?? "TBD"}
      </span>
      <span
        className={cn(
          "w-4 text-right font-mono text-sm tabular-nums",
          outcome === "won" && "font-semibold text-win",
          outcome === "lost" && "text-muted-foreground",
        )}
      >
        {showScore ? score : "–"}
      </span>
    </div>
  );
}

function outcomeOf(state: MatchState, side: 1 | 2, spoilersHidden: boolean) {
  if (spoilersHidden || state.winner === 0) return "open";
  return state.winner === side ? "won" : "lost";
}

function accessibleSummary(match: Match, state: MatchState, spoilersHidden: boolean) {
  const t1 = match.team1?.name ?? "TBD";
  const t2 = match.team2?.name ?? "TBD";
  if (state.status === "upcoming" || spoilersHidden) return `${t1} vs ${t2}, ${match.round}`;
  const status = state.status === "live" ? "live" : "final";
  return `${t1} ${state.wins1}, ${t2} ${state.wins2}, ${status}, ${match.round}`;
}

export function MatchCard({
  match,
  event,
  snapshot,
  now,
  footer = "event",
  className,
}: {
  match: Match;
  event: IgniteEvent | undefined;
  snapshot: Snapshot;
  now: number;
  footer?: "event" | "round" | "none";
  className?: string;
}) {
  const state = matchState(match, now);
  const spoilersHidden = useSpoilersHidden();
  const showScore = state.status !== "upcoming" && !spoilersHidden;
  return (
    <Card
      interactive
      className={cn(
        "gap-0 rounded-xl bg-card py-0",
        state.status === "live" && "bg-live/[0.04]",
        className,
      )}
    >
      <Link
        href={`/match/${match.id}`}
        aria-label={accessibleSummary(match, state, spoilersHidden)}
        className={cn("grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3", CARD_TARGET_CLASS)}
      >
        <div className="min-w-0 space-y-2">
          <TeamLine
            team={match.team1}
            score={state.wins1}
            outcome={outcomeOf(state, 1, spoilersHidden)}
            snapshot={snapshot}
            showScore={showScore}
          />
          <TeamLine
            team={match.team2}
            score={state.wins2}
            outcome={outcomeOf(state, 2, spoilersHidden)}
            snapshot={snapshot}
            showScore={showScore}
          />
        </div>
        <StatusLabel match={match} state={state} now={now} className="min-w-12 text-right" />
      </Link>
      {footer !== "none" && (
        <div
          className="flex min-w-0 items-center gap-2 border-t px-4 py-2 text-xs text-muted-foreground"
          title={event?.name}
        >
          {footer === "event" && event?.iconUrl && (
            <img
              src={proxiedImage(event.iconUrl)}
              alt=""
              className="size-3.5 shrink-0 object-contain"
            />
          )}
          <span className="truncate">{match.round}</span>
          {footer === "event" && <RegionTag event={event} className="ml-auto" />}
        </div>
      )}
    </Card>
  );
}
