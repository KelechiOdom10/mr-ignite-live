import { Link } from "@void/react";
import { Play } from "lucide-react";

import { Card } from "@/components/motion/card";
import { NumberTicker } from "@/components/motion/number-ticker";
import type { IgniteEvent, Match, MatchState, Snapshot } from "@/data/model";
import { matchState } from "@/data/model";
import { cn } from "@/lib/utils";

import { TeamLogo } from "./TeamMark";
import { formatRelative, formatTime, useHydrated } from "./time";

export function LiveDot({ className }: { className?: string }) {
  return (
    <span
      className={cn("live-dot inline-block size-2 rounded-full bg-live", className)}
      aria-hidden
    />
  );
}

export function StatusPill({
  state,
  match,
  now,
}: {
  state: MatchState;
  match: Match;
  now: number;
}) {
  const hydrated = useHydrated();
  if (state.status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-live/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-live">
        <LiveDot /> Live
      </span>
    );
  }
  if (state.status === "finished") {
    return (
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Final
      </span>
    );
  }
  return (
    <span className="text-xs tabular-nums text-muted-foreground">
      {hydrated && match.startsAt
        ? match.startsAt && Date.parse(match.startsAt) - now < 86_400_000
          ? formatRelative(match.startsAt, now)
          : formatTime(match.startsAt)
        : `Bo${match.bestOf}`}
    </span>
  );
}

function SeriesScore({ value, dim, size }: { value: number; dim: boolean; size: "lg" | "md" }) {
  return (
    <NumberTicker
      value={value}
      className={cn(
        "font-display font-bold tabular-nums",
        size === "lg" ? "text-6xl" : "text-2xl",
        dim ? "text-muted-foreground/60" : "text-foreground",
      )}
    />
  );
}

export function MapStrip({
  match,
  state,
  compact = false,
}: {
  match: Match;
  state: MatchState;
  compact?: boolean;
}) {
  const slots = Array.from({ length: match.bestOf }, (_, i) => match.maps[i] ?? null);
  const nextIndex = state.playedMaps.length;
  return (
    <div
      className={cn(
        "grid gap-1.5",
        compact
          ? "grid-flow-col auto-cols-fr"
          : "grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))]",
      )}
    >
      {slots.map((map, i) => {
        const played = map && map.winner !== 0;
        const current = state.status === "live" && i === nextIndex;
        const unneeded = state.status === "finished" && !played;
        return (
          <div
            key={i}
            className={cn(
              "flex min-w-0 items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs",
              current && "border-live/50 bg-live/10",
              played && "bg-card",
              unneeded && "opacity-35",
            )}
          >
            <span className="min-w-0 truncate text-muted-foreground">
              <span className="mr-1.5 font-display font-semibold text-foreground/70">M{i + 1}</span>
              {map?.map || (current ? "Picking…" : "TBD")}
            </span>
            {played ? (
              <span className="shrink-0 font-display text-sm font-bold tabular-nums">
                <span className={map.winner === 1 ? "text-win" : "text-muted-foreground"}>
                  {map.score1 ?? "–"}
                </span>
                <span className="mx-0.5 text-muted-foreground">:</span>
                <span className={map.winner === 2 ? "text-win" : "text-muted-foreground"}>
                  {map.score2 ?? "–"}
                </span>
              </span>
            ) : current ? (
              <LiveDot className="shrink-0" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function StreamLinks({ match }: { match: Match }) {
  const links = [
    match.twitch && { label: "Twitch", href: `https://twitch.tv/${match.twitch}` },
    match.youtube && { label: "YouTube", href: `https://youtube.com/@${match.youtube}/live` },
  ].filter((l): l is { label: string; href: string } => Boolean(l));
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noreferrer"
          className="relative z-10 inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3 py-1 text-xs font-medium hover:bg-muted"
        >
          <Play className="size-3" /> {l.label}
        </a>
      ))}
    </div>
  );
}

export function LiveMatchCard({
  match,
  event,
  snapshot,
  now,
}: {
  match: Match;
  event?: IgniteEvent;
  snapshot: Snapshot;
  now: number;
}) {
  const state = matchState(match, now);
  return (
    <Card interactive className="overflow-hidden bg-gradient-to-b from-live/[0.06] to-card p-0">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold uppercase tracking-wider text-primary">
            {event?.ticker ?? match.eventId}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {match.round} · Bo{match.bestOf}
          </div>
        </div>
        <StatusPill state={state} match={match} now={now} />
      </div>
      <Link
        href={`/match/${match.id}`}
        className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-6 after:absolute after:inset-0"
      >
        <TeamBlock
          team={match.team1}
          info={match.team1 ? snapshot.teams[match.team1.name] : undefined}
          align="end"
          winner={state.winner === 1}
        />
        <div className="flex items-center gap-3">
          <SeriesScore value={state.wins1} dim={state.wins1 < state.wins2} size="lg" />
          <span className="font-display text-3xl text-muted-foreground">–</span>
          <SeriesScore value={state.wins2} dim={state.wins2 < state.wins1} size="lg" />
        </div>
        <TeamBlock
          team={match.team2}
          info={match.team2 ? snapshot.teams[match.team2.name] : undefined}
          align="start"
          winner={state.winner === 2}
        />
      </Link>
      <div className="space-y-3 px-5 pb-5">
        <MapStrip match={match} state={state} />
        <StreamLinks match={match} />
      </div>
    </Card>
  );
}

function TeamBlock({
  team,
  info,
  align,
  winner,
}: {
  team: Match["team1"];
  info?: Snapshot["teams"][string];
  align: "start" | "end";
  winner: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3",
        align === "end" ? "flex-row-reverse text-right" : "",
      )}
    >
      <TeamLogo team={team} info={info} size={52} />
      <div className="min-w-0">
        <div
          className={cn(
            "truncate font-display text-2xl font-bold uppercase leading-none",
            winner && "text-win",
          )}
        >
          {team?.short ?? "TBD"}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {team?.name ?? "To be decided"}
        </div>
      </div>
    </div>
  );
}

export function MatchRow({
  match,
  event,
  snapshot,
  now,
  showEvent = true,
}: {
  match: Match;
  event?: IgniteEvent;
  snapshot: Snapshot;
  now: number;
  showEvent?: boolean;
}) {
  const state = matchState(match, now);
  const hydrated = useHydrated();
  const side = (n: 1 | 2) => {
    const team = n === 1 ? match.team1 : match.team2;
    const lost = state.status === "finished" && state.winner !== n;
    return (
      <div
        className={cn(
          "flex min-w-0 items-center gap-2.5",
          n === 1 && "flex-row-reverse text-right",
          lost && "opacity-55",
        )}
      >
        <TeamLogo team={team} info={team ? snapshot.teams[team.name] : undefined} size={26} />
        <span
          className={cn(
            "truncate font-display text-lg font-bold uppercase",
            state.winner === n && "text-win",
          )}
        >
          {team?.short ?? "TBD"}
        </span>
        <span className="hidden truncate text-xs text-muted-foreground md:inline">
          {team?.name}
        </span>
      </div>
    );
  };
  return (
    <Link
      href={`/match/${match.id}`}
      className={cn(
        "group grid grid-cols-[4.5rem_1fr_auto_1fr] items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-card sm:grid-cols-[5.5rem_1fr_5rem_1fr_9rem]",
        state.status === "live" && "border-live/30 bg-live/[0.05]",
      )}
    >
      <div className="text-xs tabular-nums text-muted-foreground">
        {state.status === "live" ? (
          <StatusPill state={state} match={match} now={now} />
        ) : hydrated && match.startsAt ? (
          formatTime(match.startsAt)
        ) : (
          "—"
        )}
      </div>
      {side(1)}
      <div className="flex items-center justify-center gap-1.5 font-display text-xl font-bold tabular-nums">
        {state.status === "upcoming" ? (
          <span className="text-sm font-semibold text-muted-foreground">Bo{match.bestOf}</span>
        ) : (
          <>
            <span
              className={
                state.winner === 1 ? "text-win" : state.winner ? "text-muted-foreground" : ""
              }
            >
              {state.wins1}
            </span>
            <span className="text-muted-foreground">:</span>
            <span
              className={
                state.winner === 2 ? "text-win" : state.winner ? "text-muted-foreground" : ""
              }
            >
              {state.wins2}
            </span>
          </>
        )}
      </div>
      {side(2)}
      {showEvent && (
        <div className="hidden min-w-0 text-right sm:block">
          <div className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {event?.region ?? ""}
          </div>
          <div className="truncate text-[11px] text-muted-foreground/70">{match.round}</div>
        </div>
      )}
    </Link>
  );
}
