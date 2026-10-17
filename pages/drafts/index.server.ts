import { defineHandler, defineHead, type InferProps } from "void";

import {
  IGNITE_2026,
  RANKED_SEASON_10_OBSERVED,
  draftCoverage,
  filterDrafts,
  summariseDrafts,
  toTeamDrafts,
} from "@/domain/draft";
import { draftScope } from "@/domain/draftScope";
import { scopeSnapshot } from "@/domain/scope";

import { currentSnapshot, readAllStats } from "../../src/sync";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const now = Date.now();
  const [full, allStats] = await Promise.all([currentSnapshot(), readAllStats()]);
  const scope = draftScope({
    stats: allStats,
    matches: full.matches,
    events: full.events,
    query: { event: c.req.query("event"), map: c.req.query("map"), mode: c.req.query("mode") },
    now,
  });
  return {
    snapshot: scopeSnapshot(full, { kind: "events" }, now),
    filter: scope.filter,
    options: scope.options,
    summary: summariseDrafts(filterDrafts(toTeamDrafts(scope.stats), scope.filter)),
    coverage: {
      ...draftCoverage(scope.stats, IGNITE_2026),
      finishedSeriesWithoutStats: scope.finishedSeriesWithoutStats,
    },
    formats: { pro: IGNITE_2026, ranked: RANKED_SEASON_10_OBSERVED },
  };
});

export const head = defineHead(() => ({ title: "Drafts" }));
