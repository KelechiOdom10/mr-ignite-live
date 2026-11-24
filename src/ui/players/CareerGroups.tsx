import type { Career } from "@/domain/player";

function compact(n: number | null): string {
  return n === null
    ? "–"
    : new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function count(n: number | null): string {
  return n === null ? "–" : n.toLocaleString("en-US");
}

function percent(rate: number | null): string {
  return rate === null ? "–" : `${(rate * 100).toFixed(1)}%`;
}

function fixed(n: number | null): string {
  return n === null ? "–" : n.toFixed(2);
}

export function CareerGroups({ career }: { career: Career }) {
  const mvpRate =
    career.mvp !== null && career.matches > 0
      ? Math.round((career.mvp / career.matches) * 100)
      : null;

  const groups = [
    {
      title: "Combat",
      stats: [
        ["KDA", fixed(career.kda), null],
        ["K/D", fixed(career.kd), null],
        ["Accuracy", percent(career.accuracy), null],
        ["Damage", compact(career.damage), null],
      ],
    },
    {
      title: "Impact",
      stats: [
        ["MVP", count(career.mvp), mvpRate === null ? null : `${mvpRate}% of matches`],
        ["SVP", count(career.svp), null],
        ["Solo kills", count(career.soloKills), null],
        ["Best streak", count(career.bestKillStreak), null],
      ],
    },
    {
      title: "Volume",
      stats: [
        ["Matches", count(career.matches), null],
        ["Win rate", percent(career.winRate), null],
        ["Play time", `${Math.round(career.playSeconds / 3600).toLocaleString("en-US")}h`, null],
        ["Healing", compact(career.healing), null],
      ],
    },
  ] as const;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {groups.map((g) => (
        <section key={g.title} aria-label={g.title} className="rounded-2xl border bg-card p-4">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {g.title}
          </h3>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            {g.stats.map(([label, value, note]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-mono text-lg whitespace-nowrap tabular-nums">
                  {value}
                  {note && (
                    <span className="ml-1.5 font-sans text-xs text-muted-foreground">{note}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
