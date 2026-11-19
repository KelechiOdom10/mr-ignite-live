import {
  type ProHeroStat,
  type ProHeroStats,
  proHeroGroupFor,
  shownWinRate,
} from "@/domain/proHeroStats";

import { HeroPortrait } from "../StatsPanel";
import { formatCalendarRange, useHydrated } from "../time";

function percent(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function HeroCell({ hero }: { hero: ProHeroStat }) {
  return (
    <span className="inline-flex items-center gap-2 sm:whitespace-nowrap">
      <span aria-hidden="true" className="hidden sm:inline">
        <HeroPortrait hero={hero} size={28} />
      </span>
      {hero.name}
    </span>
  );
}

function Rate({ value }: { value: number | null }) {
  return <span className="font-mono tabular-nums text-xs sm:text-sm">{percent(value)}</span>;
}

export function ProHeroTable({ stats, map }: { stats: ProHeroStats | null; map: string | null }) {
  const hydrated = useHydrated();

  if (!stats) {
    return (
      <p className="mt-6 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Pro game totals aren&apos;t available yet.
      </p>
    );
  }

  const group = proHeroGroupFor(stats.groups, map);

  if (!group) {
    return (
      <p className="mt-6 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No pro games on this map in the last 30 days.
      </p>
    );
  }

  const range = hydrated
    ? formatCalendarRange(stats.window.start, stats.window.end)
    : "the last 30 days";

  return (
    <section aria-labelledby="pro-hero-totals" className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="pro-hero-totals" className="scroll-mt-20 text-sm font-medium">
          All pro games, last 30 days
        </h2>
        <a
          href="https://www.mrvl.net/stats"
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          mrvl.net/stats
        </a>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {range} · {group.games} games · every region
      </p>
      <div className="mt-2 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Every pro game in {range}: hero, games played, pick rate, ban rate, protect rate and
            time-weighted win rate. This table counts every region and ignores the event filter.
          </caption>
          <thead className="bg-card text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-2 py-2 font-medium sm:px-3">
                Hero
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium sm:px-3">
                Games
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium sm:px-3">
                Pick
                <span className="hidden font-normal sm:block">of play time</span>
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium sm:px-3">
                Ban
                <span className="hidden font-normal sm:block">of games, per team</span>
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium sm:px-3">
                Protect
                <span className="hidden font-normal sm:block">of games, per team</span>
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium sm:px-3">
                Win
                <span className="hidden font-normal sm:block">10+ games</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {group.heroes.map((hero) => (
              <tr key={hero.id} className="transition-colors hover:bg-accent/50">
                <th scope="row" className="px-2 py-2 text-left font-medium sm:px-3">
                  <HeroCell hero={hero} />
                </th>
                <td className="px-2 py-2 text-right font-mono tabular-nums sm:px-3">
                  {hero.games}
                </td>
                <td className="px-2 py-2 text-right sm:px-3">
                  <Rate value={hero.pickRate} />
                </td>
                <td className="px-2 py-2 text-right sm:px-3">
                  <Rate value={hero.banRate} />
                </td>
                <td className="px-2 py-2 text-right sm:px-3">
                  <Rate value={hero.protectRate} />
                </td>
                <td className="px-2 py-2 text-right sm:px-3">
                  <Rate value={shownWinRate(hero)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Win is the share of a hero&apos;s play time that ended in a win, shown once a hero has 10 or
        more games. It isn&apos;t a chance of winning.
      </p>
    </section>
  );
}
