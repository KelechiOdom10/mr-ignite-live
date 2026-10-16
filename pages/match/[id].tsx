import { Link } from "@void/react";
import { ExternalLink, Play } from "lucide-react";

import { Card } from "@/components/motion/card";
import { NotFoundGlitch } from "@/components/motion/not-found";
import { mapInfo } from "@/domain/maps";
import { matchState, type MatchState } from "@/domain/matchState";
import type { IgniteEvent, MapResult, Match, Snapshot, Team } from "@/domain/model";
import { eventSlug } from "@/domain/scope";
import type { MatchStats, PlayerStats } from "@/domain/stats";
import { cn } from "@/lib/utils";
import { AppShell } from "@/ui/AppShell";
import { AwardBadge } from "@/ui/AwardBadge";
import { EventIcon } from "@/ui/EventRow";
import { proxiedImage } from "@/ui/images";
import { MatchCard } from "@/ui/MatchCard";
import { useSpoilersHidden } from "@/ui/spoilers";
import { HeroPortrait, StatsPanel, useMatchStats } from "@/ui/StatsPanel";
import { LiveDot } from "@/ui/StatusLabel";
import { TeamForm } from "@/ui/TeamForm";
import { TeamLogo } from "@/ui/TeamMark";
import { formatCountdown, formatDate, formatTime, useHydrated } from "@/ui/time";
import { useLiveSnapshot, type Connection } from "@/ui/useLiveSnapshot";

import type { Props } from "./[id].server";

export default function MatchPage({ snapshot: initial, matchId, stats }: Props) {
  const { snapshot, connection, now } = useLiveSnapshot(initial, { match: matchId });
  const match = snapshot.matches.find((m) => m.id === matchId);
  if (!match) {
    return (
      <AppShell snapshot={snapshot} connection={connection} now={now}>
        <NotFoundGlitch
          title="Match not found"
          description="This series is no longer listed on Liquipedia."
          homeLabel="Back to matches"
          browseHref="/events"
          browseLabel="Browse events"
        />
      </AppShell>
    );
  }
  return (
    <MatchDetail
      match={match}
      snapshot={snapshot}
      connection={connection}
      now={now}
      initialStats={stats}
    />
  );
}

function involves(match: Match, team: Team | null): boolean {
  return team !== null && (match.team1?.name === team.name || match.team2?.name === team.name);
}

function emptyMap(index: number): MapResult {
  return { index, map: "", score1: null, score2: null, winner: 0, vod: null };
}

function ScoreCenter({ match, state, now }: { match: Match; state: MatchState; now: number }) {
  const hydrated = useHydrated();
  const hidden = useSpoilersHidden();
  if (state.status === "upcoming") {
    return (
      <div className="text-center">
        <div className="text-3xl font-semibold text-muted-foreground sm:text-4xl">vs</div>
        {hydrated && match.startsAt && (
          <div className="mt-1 font-mono text-sm text-soon tabular-nums">
            {formatCountdown(match.startsAt, now)}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="text-center">
      {state.status === "live" && (
        <span className="mb-1 inline-flex items-center gap-1.5 rounded-md bg-live/15 px-2 py-0.5 text-xs font-semibold tracking-wide text-live uppercase">
          <LiveDot /> Live
        </span>
      )}
      <div className="font-mono text-4xl font-semibold tabular-nums sm:text-5xl">
        {hidden ? "– : –" : `${state.wins1} : ${state.wins2}`}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">Bo{match.bestOf}</div>
    </div>
  );
}

function TeamSide({
  team,
  snapshot,
  align,
  dim,
}: {
  team: Team | null;
  snapshot: Snapshot;
  align: "start" | "end";
  dim: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center gap-3 sm:flex-row",
        align === "end" && "sm:flex-row-reverse",
        dim && "opacity-60",
      )}
    >
      <TeamLogo team={team} info={team ? snapshot.teams[team.name] : undefined} size={64} />
      <div
        className={cn("min-w-0 text-center", align === "end" ? "sm:text-right" : "sm:text-left")}
      >
        <div className="truncate text-lg font-semibold sm:text-2xl" title={team?.name}>
          {team?.name ?? "TBD"}
        </div>
        <div className="text-xs text-muted-foreground">{team?.short ?? "To be decided"}</div>
      </div>
    </div>
  );
}

function MapCard({
  map,
  match,
  snapshot,
  current,
  mvp,
}: {
  map: MapResult;
  match: Match;
  snapshot: Snapshot;
  current: boolean;
  mvp: PlayerStats | undefined;
}) {
  const hidden = useSpoilersHidden();
  const winner = map.winner === 0 ? null : map.winner === 1 ? match.team1 : match.team2;
  const winnerScore = map.winner === 1 ? map.score1 : map.score2;
  const loserScore = map.winner === 1 ? map.score2 : map.score1;
  const info = map.map ? mapInfo(map.map) : null;
  const art = proxiedImage(info?.imageUrl);
  return (
    <div
      className={cn(
        "relative flex min-h-36 flex-col justify-between overflow-hidden rounded-xl border bg-card p-4",
        current && "border-live/50",
      )}
    >
      {art && (
        <>
          <img
            src={art}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover opacity-40"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-card via-card/70 to-card/20"
          />
        </>
      )}
      <div className="relative">
        <div className="text-xs text-muted-foreground uppercase">
          Map {map.index}
          {info && <span className="normal-case"> · {info.mode}</span>}
        </div>
        <div className="mt-1 font-medium">{map.map || (current ? "Picking…" : "TBD")}</div>
        {mvp && !hidden && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            {mvp.hero && <HeroPortrait hero={mvp.hero} size={22} />}
            <span className="min-w-0 truncate font-medium text-foreground" title={mvp.hero?.name}>
              {mvp.name}
              {mvp.hero && <span className="sr-only"> on {mvp.hero.name}</span>}
            </span>
            <AwardBadge award="MVP" className="ml-auto" />
          </div>
        )}
      </div>
      <div className="relative mt-3 flex flex-wrap items-center justify-between gap-2">
        {current ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-live">
            <LiveDot /> In progress
          </span>
        ) : winner && !hidden ? (
          <span className="inline-flex min-w-0 items-center gap-2 rounded-md bg-win/10 px-2 py-1 text-xs font-medium text-win">
            <TeamLogo team={winner} info={snapshot.teams[winner.name]} size={16} />
            <span className="truncate">{winner.short}</span>
            <span className="font-mono tabular-nums">
              {winnerScore ?? "?"}-{loserScore ?? "?"}
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{winner ? "Played" : "Not played"}</span>
        )}
        {map.vod && (
          <a
            href={map.vod}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-8 items-center gap-1 text-xs text-primary hover:underline"
          >
            VOD <ExternalLink className="size-3" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
      </div>
    </div>
  );
}

function MatchDetail({
  match,
  snapshot,
  connection,
  now,
  initialStats,
}: {
  match: Match;
  snapshot: Snapshot;
  connection: Connection;
  now: number;
  initialStats: MatchStats | null;
}) {
  const stats = useMatchStats(match.id, initialStats, snapshot.servedAt);
  const hydrated = useHydrated();
  const hidden = useSpoilersHidden();
  const event: IgniteEvent | undefined = snapshot.events.find((e) => e.id === match.eventId);
  const state = matchState(match, now);
  const currentIndex = state.status === "live" ? state.playedMaps.length + 1 : -1;
  const slots = Array.from({ length: match.bestOf }, (_, i) => i + 1);
  const h2h = snapshot.matches
    .filter((m) => m.id !== match.id && involves(m, match.team1) && involves(m, match.team2))
    .toReversed();
  const vods = match.maps.filter((m) => m.vod);

  return (
    <AppShell snapshot={snapshot} connection={connection} now={now}>
      <div className="space-y-8">
        <Card className="gap-0 rounded-2xl bg-card py-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-8 sm:pt-6">
            {event ? (
              <Link
                href={`/event/${eventSlug(event.id)}`}
                className="flex min-w-0 items-center gap-3 hover:underline"
              >
                <EventIcon event={event} size={36} />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{event.name}</div>
                  <div className="text-xs text-muted-foreground">{match.round}</div>
                </div>
              </Link>
            ) : (
              <div className="text-sm text-muted-foreground">{match.round}</div>
            )}
            {hydrated && match.startsAt && (
              <div className="text-right text-sm">
                <div className="font-medium">{formatDate(match.startsAt)}</div>
                <div className="text-xs text-muted-foreground">{formatTime(match.startsAt)}</div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-8 sm:gap-8 sm:px-8 sm:py-10">
            <TeamSide
              team={match.team1}
              snapshot={snapshot}
              align="end"
              dim={!hidden && state.winner === 2}
            />
            <ScoreCenter match={match} state={state} now={now} />
            <TeamSide
              team={match.team2}
              snapshot={snapshot}
              align="start"
              dim={!hidden && state.winner === 1}
            />
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <section aria-labelledby="streams-heading" className="space-y-3">
            <h2 id="streams-heading" className="text-lg font-semibold">
              Streams
            </h2>
            <div className="flex flex-wrap gap-2">
              {match.twitch && (
                <a
                  href={`https://twitch.tv/${match.twitch}`}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium",
                    state.status === "live" ? "bg-live text-white" : "border hover:bg-accent",
                  )}
                >
                  <Play className="size-4" aria-hidden /> Twitch · {match.twitch}
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
              {match.youtube && (
                <a
                  href={`https://youtube.com/@${match.youtube}/live`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium hover:bg-accent"
                >
                  <Play className="size-4" aria-hidden /> YouTube
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
              {!match.twitch && !match.youtube && (
                <p className="text-sm text-muted-foreground">No stream listed yet.</p>
              )}
            </div>
          </section>
          <section aria-labelledby="vods-heading" className="space-y-3">
            <h2 id="vods-heading" className="text-lg font-semibold">
              VODs
            </h2>
            {vods.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not yet available.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {vods.map((m) => (
                  <a
                    key={m.index}
                    href={m.vod ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm hover:bg-accent"
                  >
                    Map {m.index}
                    <ExternalLink className="size-3.5" aria-hidden />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ))}
              </div>
            )}
          </section>
        </div>

        <section aria-labelledby="maps-heading" className="space-y-3">
          <h2 id="maps-heading" className="text-lg font-semibold">
            Maps
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {slots.map((i) => (
              <MapCard
                key={i}
                map={match.maps.find((m) => m.index === i) ?? emptyMap(i)}
                match={match}
                snapshot={snapshot}
                current={i === currentIndex}
                mvp={stats?.maps
                  .find((m) => m.index === i)
                  ?.teams.flatMap((team) => team.players)
                  .find((p) => p.isMvp)}
              />
            ))}
          </div>
        </section>

        <StatsPanel match={match} stats={stats} snapshot={snapshot} />

        <div className="grid gap-8 lg:grid-cols-2">
          {(match.team1 || match.team2) && (
            <section aria-labelledby="form-heading" className="space-y-4">
              <h2 id="form-heading" className="text-lg font-semibold">
                Recent form
              </h2>
              {[match.team1, match.team2].map((team) =>
                team ? (
                  <TeamForm key={team.name} team={team} snapshot={snapshot} now={now} />
                ) : null,
              )}
            </section>
          )}
          {h2h.length > 0 && (
            <section aria-labelledby="h2h-heading" className="space-y-3">
              <h2 id="h2h-heading" className="text-lg font-semibold">
                Head to head
              </h2>
              <div className="grid gap-3">
                {h2h.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    event={snapshot.events.find((e) => e.id === m.eventId)}
                    snapshot={snapshot}
                    now={now}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
