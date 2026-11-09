import { Link } from "@void/react";

import { cn } from "@/lib/utils";
import { AppShell } from "@/ui/AppShell";
import { Freshness } from "@/ui/players/Freshness";
import { LeaderboardTable } from "@/ui/players/LeaderboardTable";
import { PLATFORM_NAMES, PlatformIcon } from "@/ui/players/PlatformIcon";
import { PlayersTabs } from "@/ui/players/PlayersTabs";
import { ProblemNotice } from "@/ui/players/ProblemNotice";
import { useLiveSnapshot } from "@/ui/useLiveSnapshot";

import type { Props } from "./leaderboard.server";

const DEVICES = ["pc", "ps", "xbox"] as const;

export default function LeaderboardPage({ snapshot: initial, device, leaderboard }: Props) {
  const { snapshot, connection, now } = useLiveSnapshot(initial, { view: "events" });

  return (
    <AppShell snapshot={snapshot} connection={connection} now={now}>
      <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Top 100 ranked players
        {leaderboard.ok && leaderboard.value.season ? ` in season ${leaderboard.value.season}` : ""}
        , from RivalsTracker.
      </p>
      <div className="mt-6">
        <PlayersTabs current="/leaderboard" />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex rounded-xl bg-card p-1 ring-1 ring-border ring-inset"
          role="group"
          aria-label="Platform"
        >
          {DEVICES.map((d) => (
            <Link
              key={d}
              href={d === "pc" ? "/leaderboard" : `/leaderboard?device=${d}`}
              aria-current={d === device ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                d === device && "bg-secondary text-foreground",
              )}
            >
              <PlatformIcon device={d} className="size-3.5" />
              {PLATFORM_NAMES.get(d)}
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
