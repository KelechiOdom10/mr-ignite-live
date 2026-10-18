import { Link } from "@void/react";

import { cn } from "@/lib/utils";
import { AppShell } from "@/ui/AppShell";
import { CareerTiles } from "@/ui/players/CareerTiles";
import { Freshness } from "@/ui/players/Freshness";
import { HeroesPanel } from "@/ui/players/HeroesPanel";
import { HistoryList } from "@/ui/players/HistoryList";
import { FavouriteButton, PlayerHeader, RefreshButton } from "@/ui/players/PlayerHeader";
import { ProblemNotice } from "@/ui/players/ProblemNotice";
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
  useRememberPlayer(uid && player?.ok ? { uid, name: player.value.profile.name } : null);
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
        <PlayerHeader
          profile={player.value.profile}
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
      ) : (
        <ProblemNotice problem={player.problem} />
      )}
      <div className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          {player.ok && (
            <>
              <HeroesPanel
                uid={uid}
                signature={player.value.profile.signatureHero}
                recent={heroes.recent}
                coveredMatches={heroes.coveredMatches}
                cards={heroes.cards}
                now={now}
              />
              <section aria-labelledby="career" className="space-y-2">
                <h2 id="career" className="text-sm font-semibold text-muted-foreground">
                  Career · every season and mode
                </h2>
                <CareerTiles career={player.value.career} />
              </section>
            </>
          )}
        </aside>
        <section aria-labelledby="matches" className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="matches" className="text-lg font-semibold">
              Recent matches
            </h2>
            <div className="flex gap-1" role="group" aria-label="Mode">
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
                    "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
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
      </div>
    </AppShell>
  );
}
