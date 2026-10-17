import { Star } from "lucide-react";

import { AppShell } from "@/ui/AppShell";
import { useLiveSnapshot } from "@/ui/useLiveSnapshot";

import type { Props } from "./players.server";

export default function PlayersPage({ snapshot: initial, favourites }: Props) {
  const { snapshot, connection, now } = useLiveSnapshot(initial, { view: "events" });
  return (
    <AppShell snapshot={snapshot} connection={connection} now={now}>
      <h1 className="text-2xl font-semibold tracking-tight">Players</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ranked profiles, careers and match history from RivalsIsland.
      </p>
      <section aria-labelledby="favourites" className="mt-8 space-y-3">
        <h2 id="favourites" className="text-lg font-semibold">
          Favourites
        </h2>
        {favourites.length === 0 ? (
          <p className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <Star className="size-4" aria-hidden />
            Star a player to keep them here.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {favourites.map((f) => (
              <li key={f.uid} className="rounded-lg border bg-card p-3">
                <span className="font-medium">{f.name}</span>
                <span className="ml-2 font-mono text-xs text-muted-foreground">{f.uid}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
