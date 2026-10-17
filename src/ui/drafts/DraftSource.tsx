import type { DraftCoverage } from "@/domain/draft";

import { formatRelative, useHydrated } from "../time";

export function DraftSource({
  coverage,
  now,
}: {
  coverage: DraftCoverage & { finishedSeriesWithoutStats: number };
  now: number;
}) {
  const hydrated = useHydrated();
  const newest =
    hydrated && coverage.newestFetchedAt ? formatRelative(coverage.newestFetchedAt, now) : null;
  return (
    <section aria-labelledby="draft-source" className="rounded-lg border bg-card p-4 text-sm">
      <h2 id="draft-source" className="font-medium">
        Where this comes from
      </h2>
      <ul className="mt-2 grid gap-1 text-muted-foreground">
        <li>
          mrvl.net scoreboards this site has cached: {coverage.series} series, {coverage.maps} maps
          {newest ? `, last fetched ${newest}` : ""}.
        </li>
        <li>
          {coverage.mapsWithOrder === 0
            ? "No cached map has its draft order yet, so protects aren't shown; maps cached from now on keep it."
            : `Draft order and protects are kept for ${coverage.mapsWithOrder} of ${coverage.maps} maps; older maps count bans and plays only.`}
        </li>
        {coverage.mapsWithOrder > 0 && (
          <li>
            {coverage.mapsFollowingFormat} of {coverage.mapsWithOrder} ordered maps follow the
            Ignite 2026 draft below step for step.
          </li>
        )}
        <li>
          {coverage.bansBroken === 0
            ? `None of the ${coverage.bans} bans was played by the team it was aimed at.`
            : `${coverage.bansBroken} of ${coverage.bans} bans were played by the team they were aimed at; check those maps.`}
        </li>
        {coverage.finishedSeriesWithoutStats > 0 && (
          <li>
            {coverage.finishedSeriesWithoutStats} finished series in scope have no cached
            scoreboard, so they're missing here.
          </li>
        )}
        <li>
          Counts describe these pro maps only. They aren't win rates, and ranked drafts work
          differently.
        </li>
      </ul>
    </section>
  );
}
