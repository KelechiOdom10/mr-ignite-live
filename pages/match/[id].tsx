import { Link } from "@void/react";
import { ExternalLink, Play, TriangleAlert } from "lucide-react";

import { Card } from "@/components/motion/card";
import { NotFoundGlitch } from "@/components/motion/not-found";
import { mapInfo, mapNameConflicts, type MapNameConflict } from "@/domain/maps";
import type { MapSlotView, MatchView, SideView } from "@/domain/matchView";
import type { IgniteEvent, Match, Snapshot, Team } from "@/domain/model";
import { eventSlug } from "@/domain/scope";
import type { MatchStats, PlayerStats } from "@/domain/stats";
import { cn } from "@/lib/utils";
import { AppShell } from "@/ui/AppShell";
import { AwardBadge } from "@/ui/AwardBadge";
import { EventIcon } from "@/ui/EventRow";
import { proxiedImage } from "@/ui/images";
import { MatchCard } from "@/ui/MatchCard";
import { useMatchView } from "@/ui/spoilers";
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

function ScoreCenter({ match, view, now }: { match: Match; view: MatchView; now: number }) {
  const hydrated = useHydrated();
  if (view.status === "upcoming") {
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
      {view.status === "live" && (
        <span className="mb-1 inline-flex items-center gap-1.5 rounded-md bg-live/15 px-2 py-0.5 text-xs font-semibold tracking-wide text-live uppercase">
          <LiveDot /> Live
        </span>
      )}
      <div className="font-mono text-4xl font-semibold tabular-nums sm:text-5xl">
        {view.side1.score ?? "–"} : {view.side2.score ?? "–"}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {view.status === "finished" && `${view.statusText} · `}Bo{match.bestOf}
      </div>
    </div>
  );
}

function TeamSide({
  side,
  snapshot,
  align,
}: {
  side: SideView;
  snapshot: Snapshot;
  align: "start" | "end";
}) {
  const { team } = side;
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center gap-3 sm:flex-row",
        align === "end" && "sm:flex-row-reverse",
        side.outcome === "lost" && "opacity-60",
      )}
    >
      <TeamLogo team={team} info={team ? snapshot.teams[team.name] : undefined} size={64} />
      <div
        className={cn(
          "max-w-full min-w-0 text-center",
          align === "end" ? "sm:text-right" : "sm:text-left",
        )}
      >
        <div className="truncate text-lg font-semibold sm:text-2xl" title={side.name}>
          {side.name}
        </div>
        <div className="text-xs text-muted-foreground">{team?.short ?? "To be decided"}</div>
      </div>
    </div>
  );
}

function MapCard({
  slot,
  view,
  snapshot,
  mvp,
  conflict,
}: {
  slot: MapSlotView;
  view: MatchView;
  snapshot: Snapshot;
  mvp: PlayerStats | undefined;
  conflict: MapNameConflict | undefined;
}) {
  if (slot.kind === "hidden") return <HiddenMapCard index={slot.index} />;
  const winner = slot.kind === "played" ? (slot.winner === 1 ? view.side1 : view.side2).team : null;
  const info = slot.map ? mapInfo(slot.map) : null;
  const art = proxiedImage(info?.imageUrl);
  const vod = view.vods.find((v) => v.index === slot.index);
  return (
    <div
      className={cn(
        "relative flex min-h-36 flex-col justify-between overflow-hidden rounded-xl border bg-card p-4",
        slot.kind === "current" && "border-live/50",
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
          Map {slot.index}
          {info && <span className="normal-case"> · {info.mode}</span>}
        </div>
        <div className="mt-1 font-medium">
          {slot.map ?? (slot.kind === "current" ? "Picking…" : "TBD")}
        </div>
        {conflict && (
          <p className="mt-1 inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-[0.7rem] text-primary">
            <TriangleAlert className="size-3" aria-hidden />
            mrvl says {conflict.mrvl}
          </p>
        )}
        {mvp && (
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
        {slot.kind === "current" ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-live">
            <LiveDot /> In progress
          </span>
        ) : slot.kind === "played" && winner ? (
          <span className="inline-flex min-w-0 items-center gap-2 rounded-md bg-win/10 px-2 py-1 text-xs font-medium text-win">
            <TeamLogo team={winner} info={snapshot.teams[winner.name]} size={16} />
            <span className="truncate">{winner.short}</span>
            <span className="font-mono tabular-nums">
              {slot.winnerScore ?? "?"}-{slot.loserScore ?? "?"}
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Not played</span>
        )}
        {vod && (
          <a
            href={vod.url}
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

function HiddenMapCard({ index }: { index: number }) {
  return (
    <div className="flex min-h-36 flex-col justify-between rounded-xl border bg-card p-4">
      <div className="text-xs text-muted-foreground uppercase">Map {index}</div>
      <div className="text-xs text-muted-foreground">Result hidden</div>
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
  const conflicts = mapNameConflicts(match.maps, stats?.maps ?? []);
  const hydrated = useHydrated();
  const view = useMatchView(match, now, snapshot.matches);
  const event: IgniteEvent | undefined = snapshot.events.find((e) => e.id === match.eventId);
  const team1 = view.side1.team;
  const team2 = view.side2.team;
  const h2h = snapshot.matches
    .filter((m) => m.id !== match.id && involves(m, team1) && involves(m, team2))
    .toReversed();

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
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-5 py-8 sm:gap-8 sm:px-8 sm:py-10">
            <TeamSide side={view.side1} snapshot={snapshot} align="end" />
            <ScoreCenter match={match} view={view} now={now} />
            <TeamSide side={view.side2} snapshot={snapshot} align="start" />
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
                    view.status === "live" ? "bg-live text-white" : "border hover:bg-accent",
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
            {view.vods.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not yet available.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {view.vods.map((v) => (
                  <a
                    key={v.index}
                    href={v.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm hover:bg-accent"
                  >
                    {v.label}
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
          {view.revealed && conflicts.length > 0 && (
            <p
              role="note"
              className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm"
            >
              Liquipedia and mrvl.net disagree on{" "}
              {conflicts
                .map((c) => `map ${c.index} (Liquipedia: ${c.liquipedia}; mrvl: ${c.mrvl})`)
                .join(", ")}
              . Rivals Hub shows both names and doesn&apos;t pick one; the stats below are
              mrvl&apos;s.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {view.maps.map((slot) => (
              <MapCard
                key={slot.index}
                slot={slot}
                view={view}
                snapshot={snapshot}
                mvp={stats?.maps
                  .find((m) => m.index === slot.index)
                  ?.teams.flatMap((team) => team.players)
                  .find((p) => p.isMvp)}
                conflict={conflicts.find((c) => c.index === slot.index)}
              />
            ))}
          </div>
        </section>

        <StatsPanel match={match} view={view} stats={stats} snapshot={snapshot} />

        <div className="grid gap-8 lg:grid-cols-2">
          {(team1 || team2) && (
            <section aria-labelledby="form-heading" className="space-y-4">
              <h2 id="form-heading" className="text-lg font-semibold">
                Recent form
              </h2>
              {[team1, team2].map((team) =>
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
