import { Link } from "@void/react";
import { useCallback, useEffect, useState } from "react";

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
  const view = useMatchView(match, now, snapshot.matches);
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

const EDGE_MASKS = {
  none: "",
  left: "[mask-image:linear-gradient(to_right,transparent,black_3rem)]",
  right: "[mask-image:linear-gradient(to_left,transparent,black_3rem)]",
  both: "[mask-image:linear-gradient(to_right,transparent,black_3rem,black_calc(100%-3rem),transparent)]",
} as const;

/** Which edges have chips scrolled out of view, so only those edges fade. */
function useOverflowEdges() {
  // A callback ref, so observers attach whenever the scroller mounts, including when the strip
  // starts empty and fills in from a live update.
  const [el, ref] = useState<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState<keyof typeof EDGE_MASKS>("none");

  const measure = useCallback(() => {
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdges(left && right ? "both" : left ? "left" : right ? "right" : "none");
  }, [el]);

  useEffect(() => {
    if (!el) return;
    // A ResizeObserver reports once on observe, which takes the first measurement.
    const resized = new ResizeObserver(measure);
    resized.observe(el);
    // Chips come and go as matches start and finish without the strip itself resizing.
    const changed = new MutationObserver(measure);
    changed.observe(el, { childList: true });

    return () => {
      resized.disconnect();
      changed.disconnect();
    };
  }, [el, measure]);

  return { ref, edges, measure };
}

export function MatchStrip({ snapshot, now }: { snapshot: Snapshot; now: number }) {
  const matches = stripMatches(snapshot, now);
  const { ref, edges, measure } = useOverflowEdges();

  if (matches.length === 0) return null;

  return (
    <nav aria-label="Live, upcoming and recent matches" className="border-b bg-background">
      {/* Scroll padding keeps snapping in line with the header's padding, so the first chip lines up with the logo. */}
      <div
        ref={ref}
        onScroll={measure}
        className={cn(
          "mx-auto flex max-w-7xl snap-x scroll-px-4 gap-2 overflow-x-auto px-4 py-2.5 scrollbar-none sm:scroll-px-6 sm:px-6",
          EDGE_MASKS[edges],
        )}
      >
        {matches.map((m) => (
          <Chip key={m.id} match={m} snapshot={snapshot} now={now} />
        ))}
      </div>
    </nav>
  );
}
