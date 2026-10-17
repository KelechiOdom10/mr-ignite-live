import { Link } from "@void/react";

import type { HistoryRow, Result } from "@/domain/player";
import { cn } from "@/lib/utils";

import { AwardBadge } from "../AwardBadge";
import { formatRelative, useHydrated } from "../time";

const RESULT: Record<Result, { label: string; bar: string; text: string }> = {
  win: { label: "Win", bar: "bg-win", text: "text-win" },
  loss: { label: "Loss", bar: "bg-live", text: "text-live" },
  draw: { label: "Draw", bar: "bg-muted-foreground", text: "text-muted-foreground" },
  abandoned: { label: "Abandoned", bar: "bg-muted-foreground", text: "text-muted-foreground" },
};

function minutes(seconds: number): string {
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

export function HistoryList({ rows, now }: { rows: HistoryRow[]; now: number }) {
  const hydrated = useHydrated();
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        No matches in this view.
      </p>
    );
  }
  return (
    <ol className="overflow-hidden rounded-lg border divide-y">
      {rows.map((m) => {
        const result = RESULT[m.result];
        return (
          <li key={m.matchUid}>
            <Link
              href={`/game/${encodeURIComponent(m.matchUid)}`}
              className="relative flex items-center gap-3 py-2.5 pr-3 pl-4 transition-colors hover:bg-accent/50"
            >
              <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", result.bar)} />
              <div className="w-16 shrink-0">
                <p className={cn("text-sm font-semibold", result.text)}>{result.label}</p>
                {m.score && (
                  <p className="font-mono text-xs text-muted-foreground tabular-nums">
                    {m.score.us}–{m.score.them}
                  </p>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.map ?? "Unknown map"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[
                    m.mode,
                    hydrated ? formatRelative(m.playedAt, now) : null,
                    minutes(m.durationSeconds),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {m.mvp && <AwardBadge award="MVP" />}
                {m.svp && <AwardBadge award="SVP" />}
              </div>
              <div className="w-20 shrink-0 text-right sm:w-28">
                <p className="font-mono text-sm tabular-nums">
                  {m.kills}/{m.deaths}/{m.assists}
                </p>
                {m.rankChange !== null && (
                  <p
                    className={cn(
                      "font-mono text-xs tabular-nums",
                      m.rankChange >= 0 ? "text-win" : "text-live",
                    )}
                  >
                    {m.rankChange >= 0 ? "+" : ""}
                    {m.rankChange.toFixed(1)}
                  </p>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
