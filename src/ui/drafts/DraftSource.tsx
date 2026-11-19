import {
  Collapsible,
  CollapsibleContent,
  CollapsibleIndicator,
  CollapsibleTrigger,
} from "@/components/motion/collapsible";
import type { DraftCoverage } from "@/domain/draft";

import { formatRelative, useHydrated } from "../time";

/** The one caveat everyone needs, up front; how the counts are made sits behind a toggle. */
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
      <p className="mt-1 text-muted-foreground">
        Scoreboards from mrvl.net{newest ? `, updated ${newest}` : ""}.{" "}
        <span className="text-foreground">
          Counts describe these pro maps only, not win rates; ranked drafts work differently.
        </span>
      </p>
      <Collapsible className="-mx-2 mt-2">
        <CollapsibleTrigger className="px-2 text-xs text-muted-foreground">
          How this is counted
          <CollapsibleIndicator />
        </CollapsibleTrigger>
        <CollapsibleContent contentClassName="px-2 pb-1 pt-1">
          <ul className="grid gap-1.5 text-xs text-muted-foreground">
            <li>
              {coverage.mapsWithOrder === 0
                ? "We don't have the draft order for any map yet, so protects aren't counted."
                : `Draft order and protects are kept for ${coverage.mapsWithOrder} of ${coverage.maps} maps; older maps count bans and plays only.`}
            </li>
            {coverage.mapsWithOrder > 0 && (
              <li>
                {coverage.mapsFollowingFormat} of {coverage.mapsWithOrder} ordered maps follow the
                Ignite 2026 draft step for step.
              </li>
            )}
            <li>
              {coverage.bansBroken === 0
                ? `None of the ${coverage.bans} bans was played by the team it was aimed at.`
                : `${coverage.bansBroken} of ${coverage.bans} bans were played by the team they were aimed at.`}
            </li>
            {coverage.finishedSeriesWithoutStats > 0 && (
              <li>
                We have no scoreboard for {coverage.finishedSeriesWithoutStats} finished series, so
                they&apos;re left out.
              </li>
            )}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
