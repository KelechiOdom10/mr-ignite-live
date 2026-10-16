import { Link } from "@void/react";
import { BarChart3, ExternalLink } from "lucide-react";

import { Card } from "@/components/motion/card";
import { matchState } from "@/domain/matchState";
import type { Match, Snapshot } from "@/domain/model";
import { eventSlug } from "@/domain/scope";
import { AppShell } from "@/ui/AppShell";
import { LiveMatchCard, MatchRow } from "@/ui/MatchViews";
import { TeamLogo } from "@/ui/TeamMark";
import { formatDay, formatTime, useHydrated } from "@/ui/time";
import { useLiveSnapshot, type Connection } from "@/ui/useLiveSnapshot";

import type { Props } from "./[id].server";

export default function MatchPage({ snapshot: initial, matchId, eventId }: Props) {
  const { snapshot, connection, now } = useLiveSnapshot(initial, eventId);
  const match = snapshot.matches.find((m) => m.id === matchId);
  if (!match) {
    return (
      <AppShell snapshot={snapshot} connection={connection} now={now}>
        <p className="text-muted-foreground">
          This match is no longer listed on Liquipedia.{" "}
          <Link href="/" className="underline hover:text-foreground">
            Back to matches
          </Link>
        </p>
      </AppShell>
    );
  }
  return <MatchDetail match={match} snapshot={snapshot} connection={connection} now={now} />;
}

function MatchDetail({
  match,
  snapshot,
  connection,
  now,
}: {
  match: Match;
  snapshot: Snapshot;
  connection: Connection;
  now: number;
}) {
  const hydrated = useHydrated();
  const event = snapshot.events.find((e) => e.id === match.eventId);
  const state = matchState(match, now);
  const pair = [match.team1?.name, match.team2?.name];
  const h2h = snapshot.matches.filter(
    (m) =>
      m.id !== match.id &&
      match.team1 &&
      match.team2 &&
      pair.includes(m.team1?.name) &&
      pair.includes(m.team2?.name),
  );
  const listedMaps = match.maps.filter((m) => m.map || m.winner);

  return (
    <AppShell snapshot={snapshot} connection={connection} now={now}>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Matches
        </Link>
        <span>/</span>
        {event && (
          <Link href={`/event/${eventSlug(event.id)}`} className="hover:text-foreground">
            {event.name}
          </Link>
        )}
        <span>/</span>
        <span>{match.round}</span>
        {hydrated && match.startsAt && (
          <span className="ml-auto">
            {formatDay(match.startsAt, now)} · {formatTime(match.startsAt)}
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <LiveMatchCard match={match} event={event} snapshot={snapshot} now={now} />

          <Card className="bg-card p-0">
            <div className="border-b px-5 py-3 font-display text-lg font-bold uppercase">Maps</div>
            <ol className="divide-y">
              {listedMaps.map((m) => (
                <li
                  key={m.index}
                  className="grid grid-cols-[2.5rem_1fr_auto_3.5rem] items-center gap-3 px-5 py-3"
                >
                  <span className="font-display text-sm font-bold text-muted-foreground">
                    M{m.index}
                  </span>
                  <span className="truncate font-medium">{m.map || "TBD"}</span>
                  <span className="font-display text-lg font-bold tabular-nums">
                    {m.winner ? (
                      <>
                        <span className={m.winner === 1 ? "text-win" : "text-muted-foreground"}>
                          {m.score1 ?? "–"}
                        </span>
                        <span className="mx-1 text-muted-foreground">:</span>
                        <span className={m.winner === 2 ? "text-win" : "text-muted-foreground"}>
                          {m.score2 ?? "–"}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {state.status === "live" ? "In progress" : "—"}
                      </span>
                    )}
                  </span>
                  {m.vod ? (
                    <a
                      href={m.vod}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-end gap-1 text-xs text-primary hover:underline"
                    >
                      VOD <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span />
                  )}
                </li>
              ))}
              {listedMaps.length === 0 && (
                <li className="px-5 py-4 text-sm text-muted-foreground">
                  Map picks appear once the series starts.
                </li>
              )}
            </ol>
          </Card>

          <Card className="bg-card p-5">
            <div className="flex items-center gap-2 font-display text-lg font-bold uppercase">
              <BarChart3 className="size-4 text-primary" /> MVP, SVP &amp; player stats
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Per-map MVP/SVP, hero picks and player stats will show here once a stats source is
              connected.
            </p>
          </Card>
        </div>

        <aside className="space-y-6">
          {[match.team1, match.team2].map((team, i) =>
            team ? (
              <Card key={i} className="bg-card p-4">
                <div className="flex items-center gap-3">
                  <TeamLogo team={team} info={snapshot.teams[team.name]} size={40} />
                  <div>
                    <div className="font-display text-xl font-bold uppercase leading-none">
                      {team.short}
                    </div>
                    <div className="text-xs text-muted-foreground">{team.name}</div>
                  </div>
                  <a
                    href={`https://liquipedia.net/marvelrivals/${team.name.replace(/ /g, "_")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                  >
                    Liquipedia ↗
                  </a>
                </div>
              </Card>
            ) : null,
          )}
          {h2h.length > 0 && (
            <div className="space-y-1">
              <h2 className="px-3 font-display text-lg font-bold uppercase">Head to head</h2>
              {h2h.map((m) => (
                <MatchRow
                  key={m.id}
                  match={m}
                  event={event}
                  snapshot={snapshot}
                  now={now}
                  showEvent={false}
                />
              ))}
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
