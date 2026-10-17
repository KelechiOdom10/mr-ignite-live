import { AppShell } from "@/ui/AppShell";
import { DraftStrip, MatchTeams } from "@/ui/players/MatchTeams";
import { ProblemNotice } from "@/ui/players/ProblemNotice";
import { formatDate, useHydrated } from "@/ui/time";
import { useLiveSnapshot } from "@/ui/useLiveSnapshot";

import type { Props } from "./[matchUid].server";

function minutes(seconds: number): string {
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

export default function GamePage({ snapshot: initial, match }: Props) {
  const { snapshot, connection, now } = useLiveSnapshot(initial, { view: "events" });
  const hydrated = useHydrated();
  return (
    <AppShell snapshot={snapshot} connection={connection} now={now}>
      {match.ok ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">{match.value.map ?? "Match"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[
              match.value.mode,
              match.value.category,
              match.value.season ? `Season ${match.value.season}` : null,
              minutes(match.value.durationSeconds),
              hydrated ? formatDate(match.value.playedAt) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="mt-6 space-y-6">
            <DraftStrip match={match.value} />
            <MatchTeams match={match.value} />
          </div>
          <p className="mt-6 text-xs text-muted-foreground">Match data from RivalsIsland.</p>
        </>
      ) : (
        <ProblemNotice problem={match.problem} />
      )}
    </AppShell>
  );
}
