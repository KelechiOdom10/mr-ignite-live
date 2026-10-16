import type { MatchState } from "@/domain/matchState";
import type { Match } from "@/domain/model";
import { cn } from "@/lib/utils";

import { formatCountdown, formatTime, useHydrated } from "./time";

export function LiveDot({ className }: { className?: string }) {
  return (
    <span
      className={cn("live-dot inline-block size-1.5 rounded-full bg-live", className)}
      aria-hidden
    />
  );
}

const DAY_MS = 86_400_000;

export function StatusLabel({
  match,
  state,
  now,
  className,
}: {
  match: Match;
  state: MatchState;
  now: number;
  className?: string;
}) {
  const hydrated = useHydrated();
  if (state.status === "live") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-live uppercase",
          className,
        )}
      >
        <LiveDot /> Live
      </span>
    );
  }
  if (state.status === "finished") {
    return <span className={cn("text-xs text-muted-foreground", className)}>Final</span>;
  }
  if (!hydrated || !match.startsAt) {
    return <span className={cn("text-xs text-muted-foreground", className)}>Bo{match.bestOf}</span>;
  }
  const soon = Date.parse(match.startsAt) - now < DAY_MS;
  return (
    <span
      className={cn(
        "font-mono text-xs tabular-nums",
        soon ? "text-soon" : "text-muted-foreground",
        className,
      )}
    >
      {soon ? formatCountdown(match.startsAt, now) : formatTime(match.startsAt)}
    </span>
  );
}
