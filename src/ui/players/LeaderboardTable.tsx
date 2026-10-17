import { Link } from "@void/react";

import type { LeaderboardRow } from "@/domain/player";

import { formatRelative, useHydrated } from "../time";
import { PlayerAvatar } from "./PlayerAvatar";
import { RankBadge } from "./RankBadge";

function percent(rate: number | null): string {
  return rate === null ? "–" : `${Math.round(rate * 100)}%`;
}

export function LeaderboardTable({ rows, now }: { rows: LeaderboardRow[]; now: number }) {
  const hydrated = useHydrated();
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-card text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="w-12 px-3 py-2 text-right font-medium">
              #
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Player
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Rank
            </th>
            <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">
              Matches
            </th>
            <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">
              Win rate
            </th>
            <th scope="col" className="hidden px-3 py-2 text-right font-medium md:table-cell">
              Last played
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.uid} className="transition-colors hover:bg-accent/50">
              <td className="px-3 py-2 text-right font-mono text-muted-foreground tabular-nums">
                {r.position}
              </td>
              <td className="px-3 py-2">
                <Link
                  href={`/player/${r.uid}`}
                  className="flex min-w-0 items-center gap-2 font-medium hover:underline"
                >
                  <PlayerAvatar iconUrl={r.iconUrl} name={r.name} size={24} />
                  <span className="truncate">{r.name}</span>
                </Link>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <RankBadge rank={r.rank} />
              </td>
              <td className="hidden px-3 py-2 text-right font-mono tabular-nums sm:table-cell">
                {r.matches ?? "–"}
              </td>
              <td className="hidden px-3 py-2 text-right font-mono tabular-nums sm:table-cell">
                {percent(r.winRate)}
              </td>
              <td className="hidden px-3 py-2 text-right text-muted-foreground md:table-cell">
                {hydrated && r.lastPlayedAt ? formatRelative(r.lastPlayedAt, now) : "–"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
