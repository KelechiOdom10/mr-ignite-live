import {
  MIN_MATCHES_FOR_WIN_RATE,
  seasonRecord,
  type PlayerProfile,
  type SeasonRecord,
} from "@/domain/player";
import { cn } from "@/lib/utils";

import { rankTierClass } from "./RankBadge";
import { RankIcon } from "./RankIcon";

function matches(n: number): string {
  return `${n} match${n === 1 ? "" : "es"}`;
}

function SeasonSummary({ record }: { record: SeasonRecord }) {
  if (record.kind === "unknown") return <span className="text-muted-foreground">Not known</span>;

  if (record.kind === "none") return <span className="text-muted-foreground">No matches yet</span>;

  if (record.kind === "few") {
    return (
      <span>
        {record.wins}W of {matches(record.matches)}{" "}
        <span className="text-muted-foreground">· win rate after {MIN_MATCHES_FOR_WIN_RATE}</span>
      </span>
    );
  }

  return (
    <span>
      {record.wins}W of {matches(record.matches)}{" "}
      <span className="text-muted-foreground">({Math.round(record.winRate * 100)}%)</span>
    </span>
  );
}

export function RankCard({ profile }: { profile: PlayerProfile }) {
  const { rank, peakRank } = profile;

  return (
    <section
      aria-label="Rank"
      className="relative flex flex-col overflow-hidden rounded-2xl border bg-card p-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -left-20 size-72 rounded-full bg-[radial-gradient(closest-side,var(--color-primary),transparent)] opacity-15"
      />
      <div className="relative flex items-center gap-5">
        {rank.name ? (
          <RankIcon
            name={rank.name}
            size={112}
            className="drop-shadow-[0_8px_24px_rgb(0_0_0/0.5)]"
          />
        ) : (
          <div
            aria-hidden="true"
            className="grid size-28 place-items-center rounded-full border border-dashed text-sm text-muted-foreground"
          >
            Unranked
          </div>
        )}
        <div className="min-w-0">
          {profile.season && (
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Season {profile.season}
            </p>
          )}
          <p className={cn("text-2xl leading-tight font-semibold", rankTierClass(rank.name))}>
            {rank.name ?? "Unranked"}
          </p>
          {rank.score !== null && (
            <p className="font-mono text-sm tabular-nums">{Math.round(rank.score)} RS</p>
          )}
        </div>
      </div>
      <dl className="relative mt-auto space-y-2 border-t pt-4 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="shrink-0 text-xs text-muted-foreground">This season</dt>
          <dd className="text-right">
            <SeasonSummary record={seasonRecord(profile)} />
          </dd>
        </div>
        {peakRank.name && (
          <div className="flex items-center justify-between gap-3">
            <dt className="shrink-0 text-xs text-muted-foreground">Peak</dt>
            <dd className="flex min-w-0 items-center gap-1.5">
              <RankIcon name={peakRank.name} size={20} />
              <span className={cn("truncate font-medium", rankTierClass(peakRank.name))}>
                {peakRank.name}
              </span>
              {peakRank.score !== null && (
                <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                  {Math.round(peakRank.score)} RS
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
