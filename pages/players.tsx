import { Link } from "@void/react";
import { ArrowRight, Star } from "lucide-react";

import { AppShell } from "@/ui/AppShell";
import { PlayerAvatar } from "@/ui/players/PlayerAvatar";
import { PlayerCard } from "@/ui/players/PlayerCard";
import { PlayersTabs } from "@/ui/players/PlayersTabs";
import { RankBadge } from "@/ui/players/RankBadge";
import { useRecentPlayers } from "@/ui/players/recentPlayers";
import { SearchForm } from "@/ui/players/SearchForm";
import { useLiveSnapshot } from "@/ui/useLiveSnapshot";

import type { Props } from "./players.server";

export default function PlayersPage({ snapshot: initial, favourites, top, prefill }: Props) {
  const { snapshot, connection, now } = useLiveSnapshot(initial, { view: "events" });
  const saved = new Set(favourites.map((f) => f.uid));

  const recent = useRecentPlayers()
    .filter((p) => !saved.has(p.uid))
    .map((p) => ({
      uid: p.uid,
      name: p.name,
      iconUrl: p.iconUrl ?? null,
      club: null,
      rank: p.rank ?? null,
      device: p.device ?? null,
      form: [],
    }));

  return (
    <AppShell snapshot={snapshot} connection={connection} now={now}>
      <h1 className="text-2xl font-semibold tracking-tight">Players</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ranked profiles, careers and match history from RivalsTracker.
      </p>
      <div className="mt-6">
        <PlayersTabs current="/players" />
      </div>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-10">
          <div className="max-w-xl">
            <SearchForm initialName={prefill.name} autoFocus={prefill.focus} />
          </div>

          <section aria-labelledby="favourites" className="space-y-3">
            <h2 id="favourites" className="text-lg font-semibold">
              Favourites
            </h2>
            {favourites.length === 0 ? (
              <p className="flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                <Star className="size-4" aria-hidden />
                Star a player on their page to keep them here.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {favourites.map((f) => (
                  <li key={f.uid}>
                    <PlayerCard player={f} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {recent.length > 0 && (
            <section aria-labelledby="recent" className="space-y-3">
              <div>
                <h2 id="recent" className="text-lg font-semibold">
                  Recently viewed
                </h2>
                <p className="text-sm text-muted-foreground">Kept in this browser.</p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {recent.map((p) => (
                  <li key={p.uid}>
                    <PlayerCard player={p} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {top.length > 0 && (
          <aside aria-labelledby="top" className="space-y-3">
            <h2 id="top" className="text-lg font-semibold">
              Top of the leaderboard
            </h2>
            <ol className="divide-y rounded-xl border bg-card">
              {top.map((r) => (
                <li key={r.uid}>
                  <Link
                    href={`/player/${r.uid}`}
                    rel="nofollow"
                    className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent/40"
                  >
                    <span className="w-4 text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {r.position}
                    </span>
                    <PlayerAvatar iconUrl={r.iconUrl} name={r.name} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{r.name}</span>
                      <RankBadge rank={r.rank} iconSize={16} className="text-xs" />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Full leaderboard <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </aside>
        )}
      </div>
    </AppShell>
  );
}
