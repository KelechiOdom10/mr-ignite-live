import { Link } from "@void/react";

import { Card, CARD_TARGET_CLASS } from "@/components/motion/card";
import type { SideView } from "@/domain/matchView";
import type { IgniteEvent, Match, Snapshot } from "@/domain/model";
import { cn } from "@/lib/utils";

import { proxiedImage } from "./images";
import { RegionTag } from "./RegionTag";
import { useMatchView } from "./spoilers";
import { StatusLabel } from "./StatusLabel";
import { TeamLogo } from "./TeamMark";

function TeamLine({ side, snapshot }: { side: SideView; snapshot: Snapshot }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <TeamLogo
        team={side.team}
        info={side.team ? snapshot.teams[side.team.name] : undefined}
        size={22}
      />
      <span
        title={side.name}
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          side.outcome === "won" ? "font-semibold" : "font-medium",
          (side.outcome === "lost" || !side.team) && "text-muted-foreground",
        )}
      >
        {side.short}
      </span>
      <span
        className={cn(
          "w-4 text-right font-mono text-sm tabular-nums",
          side.outcome === "won" && "font-semibold text-win",
          side.outcome === "lost" && "text-muted-foreground",
        )}
      >
        {side.score ?? "–"}
      </span>
    </div>
  );
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
  const view = useMatchView(match, now, snapshot.matches);
  return (
    <Card
      interactive
      className={cn(
        "gap-0 rounded-xl bg-card py-0",
        view.status === "live" && "bg-live/[0.04]",
        className,
      )}
    >
      <Link
        href={`/match/${match.id}`}
        aria-label={view.summary}
        className={cn("grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3", CARD_TARGET_CLASS)}
      >
        <div className="min-w-0 space-y-2">
          <TeamLine side={view.side1} snapshot={snapshot} />
          <TeamLine side={view.side2} snapshot={snapshot} />
        </div>
        <StatusLabel match={match} view={view} now={now} className="min-w-12 text-right" />
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
