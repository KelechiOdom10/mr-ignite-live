import { Link } from "@void/react";

import { cn } from "@/lib/utils";
import { AppShell } from "@/ui/AppShell";
import { Freshness } from "@/ui/players/Freshness";
import { LeaderboardTable } from "@/ui/players/LeaderboardTable";
import { PlayersTabs } from "@/ui/players/PlayersTabs";
import { ProblemNotice } from "@/ui/players/ProblemNotice";
import { useLiveSnapshot } from "@/ui/useLiveSnapshot";

import type { Props } from "./leaderboard.server";

const DEVICES = [
  { value: "pc", label: "PC" },
  { value: "ps", label: "PlayStation" },
  { value: "xbox", label: "Xbox" },
] as const;

export default function LeaderboardPage({ snapshot: initial, device, leaderboard }: Props) {
  const { snapshot, connection, now } = useLiveSnapshot(initial, { view: "events" });
  return (
    <AppShell snapshot={snapshot} connection={connection} now={now}>
      <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Top 100 ranked players
        {leaderboard.ok && leaderboard.value.season ? ` in season ${leaderboard.value.season}` : ""}
        , from RivalsIsland.
      </p>
      <div className="mt-6">
        <PlayersTabs current="/leaderboard" />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1" role="group" aria-label="Platform">
          {DEVICES.map((d) => (
            <Link
              key={d.value}
              href={d.value === "pc" ? "/leaderboard" : `/leaderboard?device=${d.value}`}
              aria-current={d.value === device ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                d.value === device && "bg-secondary text-foreground",
              )}
            >
              {d.label}
            </Link>
          ))}
        </div>
        {leaderboard.ok && <Freshness freshness={leaderboard.value.freshness} now={now} />}
      </div>
      <div className="mt-4">
        {leaderboard.ok ? (
          <LeaderboardTable rows={leaderboard.value.rows} now={now} />
        ) : (
          <ProblemNotice problem={leaderboard.problem} />
        )}
      </div>
    </AppShell>
  );
}
