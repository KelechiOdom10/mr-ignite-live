import { Link } from "@void/react";

import { cn } from "@/lib/utils";
import { AppShell } from "@/ui/AppShell";
import { CareerGroups } from "@/ui/players/CareerGroups";
import { Freshness } from "@/ui/players/Freshness";
import { HeroesPanel } from "@/ui/players/HeroesPanel";
import { HistoryList } from "@/ui/players/HistoryList";
import { FavouriteButton, PlayerHeader, RefreshButton } from "@/ui/players/PlayerHeader";
import { ProblemNotice } from "@/ui/players/ProblemNotice";
import { RankCard } from "@/ui/players/RankCard";
import { RankTrendCard } from "@/ui/players/RankTrendCard";
import { useRememberPlayer } from "@/ui/players/recentPlayers";
import { useLiveSnapshot } from "@/ui/useLiveSnapshot";

import type { Props } from "./[uid].server";

const CATEGORIES = [
  { value: "competitive", label: "Competitive" },
  { value: "all", label: "All modes" },
] as const;

export default function PlayerPage({
  snapshot: initial,
  uid,
  query,
  player,
  history,
  heroes,
  isFavourite,
}: Props) {
  const { snapshot, connection, now } = useLiveSnapshot(initial, { view: "events" });
  const device = history?.ok ? (history.value.rows[0]?.device ?? null) : null;

  useRememberPlayer(
    uid && player?.ok
      ? {
          uid,
          name: player.value.profile.name,
          iconUrl: player.value.profile.iconUrl,
          rank: player.value.profile.rank,
          device,
        }
      : null,
  );

  if (!uid || !player || !history || !heroes) {
    return (
      <AppShell snapshot={snapshot} connection={connection} now={now}>
        <ProblemNotice problem="not_found" />
      </AppShell>
    );
  }

  const historyCost = history.ok || history.problem !== "history_private" ? 10 : 0;

  return (
    <AppShell snapshot={snapshot} connection={connection} now={now}>
      {player.ok ? (
        <div className="space-y-6">
          <PlayerHeader
            profile={player.value.profile}
            device={device}
            freshness={player.value.freshness}
            now={now}
            actions={
              <>
                <FavouriteButton
                  uid={uid}
                  name={player.value.profile.name}
                  isFavourite={isFavourite}
                />
                <RefreshButton
                  uid={uid}
                  category={query.category}
                  page={query.page}
                  cost={10 + historyCost}
                />
              </>
            }
          />
          <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
            <RankCard profile={player.value.profile} />
            <RankTrendCard
              rows={history.ok ? history.value.rows : []}
              unavailable={
                history.ok
                  ? undefined
                  : history.problem === "history_private"
                    ? "Match history is private, so there's no rank trend."
                    : "Match history didn't load, so there's no rank trend."
              }
            />
          </div>
          <section aria-labelledby="career" className="space-y-3">
            <h2 id="career" className="text-sm font-semibold text-muted-foreground">
              Career · every season and mode
            </h2>
            <CareerGroups career={player.value.career} />
          </section>
        </div>
      ) : (
        <ProblemNotice problem={player.problem} />
      )}
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="matches" className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="matches" className="text-lg font-semibold">
              Recent matches
            </h2>
            <div
              className="flex rounded-xl bg-card p-1 ring-1 ring-border ring-inset"
              role="group"
              aria-label="Mode"
            >
              {CATEGORIES.map((c) => (
                <Link
                  key={c.value}
                  href={
                    c.value === "competitive"
                      ? `/player/${uid}`
                      : `/player/${uid}?category=${c.value}`
                  }
                  rel="nofollow"
                  aria-current={c.value === query.category ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground",
                    c.value === query.category && "bg-secondary text-foreground",
                  )}
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
          {history.ok ? (
            <>
              <HistoryList
                rows={history.value.rows}
                currentSeason={player.ok ? player.value.profile.season : null}
                now={now}
              />
              <div className="flex items-center justify-between">
                <Freshness freshness={history.value.freshness} now={now} />
                {history.value.hasMore && query.page < 50 && (
                  <Link
                    href={`/player/${uid}?category=${query.category}&page=${query.page + 1}`}
                    rel="nofollow"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Older matches · 10 credits
                  </Link>
                )}
              </div>
            </>
          ) : (
            <ProblemNotice problem={history.problem} />
          )}
        </section>
        {player.ok && (
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <HeroesPanel
              uid={uid}
              signature={player.value.profile.signatureHero}
              recent={heroes.recent}
              coveredMatches={heroes.coveredMatches}
              cards={heroes.cards}
              now={now}
            />
          </aside>
        )}
      </div>
    </AppShell>
  );
}
