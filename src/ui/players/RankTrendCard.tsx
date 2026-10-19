import { rankTrend, type HistoryRow, type Result } from "@/domain/player";
import { cn } from "@/lib/utils";

const WIDTH = 600;
const HEIGHT = 120;

const RESULT_CHIP = new Map<Result, string>([
  ["win", "bg-win"],
  ["loss", "bg-live"],
  ["draw", "bg-muted-foreground"],
  ["abandoned", "bg-muted-foreground/50"],
]);

function linePoints(values: readonly number[]): string {
  const lo = Math.min(...values);
  const span = Math.max(...values) - lo || 1;
  const step = WIDTH / Math.max(values.length - 1, 1);

  return values
    .map((v, i) => `${(i * step).toFixed(1)},${(HEIGHT - ((v - lo) / span) * HEIGHT).toFixed(1)}`)
    .join(" ");
}

/**
 * Whether the player is climbing: rank score after each ranked match on this history page, with
 * the record and current streak. Rank score keeps counting across tiers, so the line has no jumps.
 */
export function RankTrendCard({
  rows,
  unavailable,
}: {
  rows: readonly HistoryRow[];
  /** Why there's no history to chart, when there isn't. */
  unavailable?: string;
}) {
  const trend = rankTrend(rows);
  const { points, net, wins, losses, streak } = trend;

  if (points.length < 2) {
    return (
      <section
        aria-label="Rank trend"
        className="grid place-items-center rounded-2xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground"
      >
        {unavailable ?? "Not enough ranked matches on this page to show a trend."}
      </section>
    );
  }

  const line = linePoints(points.map((p) => p.ladder));
  const change = `${net >= 0 ? "up" : "down"} ${Math.abs(Math.round(net))}`;

  return (
    <section aria-labelledby="rank-trend" className="flex flex-col rounded-2xl border bg-card p-6">
      <h2
        id="rank-trend"
        className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        Rank score · last {points.length} ranked
      </h2>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span
          className={cn("text-2xl font-semibold tabular-nums", net >= 0 ? "text-win" : "text-live")}
        >
          {net >= 0 ? "+" : "−"}
          {Math.abs(Math.round(net))}
        </span>
        <span className="text-muted-foreground">
          RS · {wins}W {losses}L
          {streak &&
            streak.count > 1 &&
            ` · ${streak.result === "win" ? "won" : "lost"} last ${streak.count}`}
        </span>
      </p>
      <svg
        viewBox={`0 -4 ${WIDTH} ${HEIGHT + 8}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Rank score ${change} over ${points.length} ranked matches.`}
        className="mt-4 h-28 w-full overflow-visible"
      >
        <defs>
          <linearGradient id="rank-trend-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--color-primary)" stopOpacity="0.25" />
            <stop offset="1" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,${HEIGHT + 4} ${line} ${WIDTH},${HEIGHT + 4}`}
          fill="url(#rank-trend-fill)"
        />
        <polyline
          points={line}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <ol aria-label="Results, oldest first" className="mt-3 flex gap-1">
        {points.map((p) => (
          <li
            key={p.matchUid}
            title={p.result}
            className={cn("h-2 flex-1 rounded-full", RESULT_CHIP.get(p.result))}
          >
            <span className="sr-only">{p.result}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
