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

export default function PlayerPage({
  snapshot: initial,
  uid,
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
                <RefreshButton uid={uid} />
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
          <h2 id="matches" className="text-lg font-semibold">
            Recent matches
          </h2>
          {history.ok ? (
            <>
              <HistoryList
                rows={history.value.rows}
                currentSeason={player.ok ? player.value.profile.season : null}
                now={now}
              />
              <Freshness freshness={history.value.freshness} now={now} />
            </>
          ) : (
            <ProblemNotice problem={history.problem} />
          )}
        </section>
        {player.ok && (
          <aside className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto">
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
