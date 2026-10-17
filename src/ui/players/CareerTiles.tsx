import type { Career } from "@/domain/player";
import { cn } from "@/lib/utils";

function compact(n: number): string {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(
    n,
  );
}

function hours(seconds: number): string {
  return `${Math.round(seconds / 3600).toLocaleString()}h`;
}

export function CareerTiles({ career }: { career: Career }) {
  const tiles = [
    { label: "Matches", value: career.matches.toLocaleString() },
    {
      label: "Win rate",
      value: career.winRate === null ? "–" : `${(career.winRate * 100).toFixed(1)}%`,
    },
    { label: "KDA", value: career.kda === null ? "–" : career.kda.toFixed(2) },
    {
      label: "K / D / A",
      value: `${compact(career.kills)} / ${compact(career.deaths)} / ${compact(career.assists)}`,
    },
    { label: "MVP / SVP", value: `${career.mvp} / ${career.svp}` },
    {
      label: "Accuracy",
      value: career.accuracy === null ? "–" : `${(career.accuracy * 100).toFixed(1)}%`,
    },
    { label: "Damage", value: compact(career.damage) },
    { label: "Healing", value: compact(career.healing) },
    { label: "Play time", value: hours(career.playSeconds) },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-lg border bg-card p-3">
          <dt className="text-xs text-muted-foreground">{t.label}</dt>
          <dd
            className={cn(
              "mt-1 font-mono font-semibold whitespace-nowrap tabular-nums",
              t.value.length > 10 ? "text-sm" : "text-lg",
            )}
          >
            {t.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
