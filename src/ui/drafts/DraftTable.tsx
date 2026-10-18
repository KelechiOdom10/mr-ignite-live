import type { DraftSummary } from "@/domain/draft";

import { HeroPortrait } from "../StatsPanel";

/** mrvl writes Deadpool's forms as "Deadpool(Vanguard)", which can't wrap on a phone. */
function displayName(name: string): string {
  return name.replace(/(\S)\(/, "$1 (");
}

function share(count: number, of: number): string {
  return of === 0 ? "–" : `${Math.round((count / of) * 100)}%`;
}

function Count({ count, of }: { count: number; of: number }) {
  return (
    <span className="inline-flex items-baseline justify-end gap-1.5">
      <span className="font-mono tabular-nums">{count}</span>
      <span className="hidden w-9 text-right text-xs text-muted-foreground tabular-nums sm:inline-block">
        {share(count, of)}
      </span>
    </span>
  );
}

export function DraftTable({ summary }: { summary: DraftSummary }) {
  const { rows, sample } = summary;
  const protectsKnown = sample.withProtects > 0;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <caption className="sr-only">
          Hero presence, plays, bans and protects across {sample.teamDrafts} team drafts on{" "}
          {sample.maps} maps
        </caption>
        <thead className="bg-card text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-2 py-2 sm:px-3 font-medium">
              Hero
            </th>
            <th scope="col" className="px-2 py-2 sm:px-3 text-right font-medium">
              Present
              <span className="block font-normal">of {sample.maps} maps</span>
            </th>
            <th scope="col" className="px-2 py-2 sm:px-3 text-right font-medium">
              Played
              <span className="block font-normal">of {sample.teamDrafts} drafts</span>
            </th>
            <th scope="col" className="px-2 py-2 sm:px-3 text-right font-medium">
              Banned
              <span className="block font-normal">of {sample.teamDrafts} drafts</span>
            </th>
            {protectsKnown && (
              <th scope="col" className="px-2 py-2 sm:px-3 text-right font-medium">
                Protected
                <span className="block font-normal">of {sample.withProtects} drafts</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.hero.id} className="transition-colors hover:bg-accent/50">
              <th scope="row" className="px-2 py-2 sm:px-3 text-left font-medium">
                <span className="inline-flex items-center gap-2 sm:whitespace-nowrap">
                  <span aria-hidden="true" className="hidden sm:inline">
                    <HeroPortrait hero={r.hero} size={28} />
                  </span>
                  {displayName(r.hero.name)}
                </span>
              </th>
              <td className="px-2 py-2 sm:px-3 text-right">
                <Count count={r.presentMaps} of={sample.maps} />
              </td>
              <td className="px-2 py-2 sm:px-3 text-right">
                <Count count={r.played} of={sample.teamDrafts} />
              </td>
              <td className="px-2 py-2 sm:px-3 text-right">
                <Count count={r.banned} of={sample.teamDrafts} />
              </td>
              {protectsKnown && (
                <td className="px-2 py-2 sm:px-3 text-right">
                  <Count count={r.protected} of={sample.withProtects} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
