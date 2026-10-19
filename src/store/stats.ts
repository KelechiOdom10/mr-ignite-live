import { z } from "zod";

import { matchState } from "@/domain/matchState";
import type { MapOverride, Match, Snapshot } from "@/domain/model";
import { MatchStatsSchema, type MatchStats } from "@/domain/stats";
import { findMrvlMatch, toMapOverrides, toMatchStats } from "@/mrvl/align";
import {
  type MrvlClient,
  MrvlHttpError,
  type MrvlMatchPage,
  MrvlResponseError,
  MrvlUnreachableError,
} from "@/mrvl/client";

import { kvKey, type KvStore } from "./kv";
import { statsChanged } from "./plan";

export const statsKey = (matchId: string) => kvKey(`stats:v2:${matchId}`, MatchStatsSchema);
const RECENT_LIMIT = 40;
const LIVE_LIMIT = 20;
const MAX_PAGES_PER_SYNC = 6;
const LOOKBACK_MS = 12 * 60 * 60 * 1000;

const StatsIndexSchema = z.record(
  z.string(),
  z.object({
    sourceMatchId: z.string(),
    sourceUpdatedAt: z.string(),
    /** Set once a fetch has kept draft order; earlier entries get one refetch in the lookback. */
    draftOrder: z.literal(true).optional(),
    heroLines: z.literal(true).optional(),
  }),
);

export type StatsIndex = z.infer<typeof StatsIndexSchema>;

export const STATS_INDEX_KEY = kvKey("stats-index:v2", StatsIndexSchema);

export async function readMatchStats(store: KvStore, matchId: string): Promise<MatchStats | null> {
  const parsed = await store.get(statsKey(matchId));

  return parsed?.success ? parsed.data : null;
}

/** Every stored series' stats; a value that no longer parses is skipped like a missing one. */
export async function readAllMatchStats(store: KvStore): Promise<MatchStats[]> {
  const ids = Object.keys(await readIndex(store));
  const stats = await Promise.all(ids.map((id) => readMatchStats(store, id)));

  return stats.filter((s) => s !== null);
}

async function readIndex(store: KvStore): Promise<StatsIndex> {
  const parsed = await store.get(STATS_INDEX_KEY);

  return parsed?.success ? parsed.data : {};
}

/** Indexed before draft order or per-hero lines were kept: worth one refetch while in lookback. */
function needsBackfill(entry: StatsIndex[string] | undefined): boolean {
  return entry !== undefined && (entry.draftOrder !== true || entry.heroLines !== true);
}

export function statsCandidates(snapshot: Snapshot, now: number): Match[] {
  return snapshot.matches.filter((m) => {
    const status = matchState(m, now).status;

    if (status === "live") return true;

    if (status !== "finished" || !m.startsAt) return false;

    return now - Date.parse(m.startsAt) < LOOKBACK_MS;
  });
}

/** Null when mrvl fails for this series only; it stays out of the index, so the next run retries. */
async function seriesPage(mrvl: MrvlClient, id: string): Promise<MrvlMatchPage | null> {
  try {
    return await mrvl.matchPage(id);
  } catch (error) {
    if (
      !(
        error instanceof MrvlHttpError ||
        error instanceof MrvlResponseError ||
        error instanceof MrvlUnreachableError
      )
    )
      throw error;
    console.warn("Skipping an mrvl series page until the next sync", { id, error: error.message });

    return null;
  }
}

export interface StatsChanges {
  /** Stats whose maps differ from what is stored. */
  updated: MatchStats[];
  /** Map results of every series fetched, changed or not; `nextStored` skips ones already stored. */
  mapOverrides: Record<string, MapOverride[]>;
  /** Null when no series page was fetched. */
  index: StatsIndex | null;
}

export function noStatsChanges(): StatsChanges {
  return { updated: [], mapOverrides: {}, index: null };
}

export async function fetchStatsChanges({
  store,
  mrvl,
  snapshot,
  now,
}: {
  store: KvStore;
  mrvl: MrvlClient;
  snapshot: Snapshot;
  now: number;
}): Promise<StatsChanges> {
  const candidates = statsCandidates(snapshot, now);

  if (candidates.length === 0) return noStatsChanges();

  // mrvl can list a just-finished series under "upcoming" for a while, so search all three lists.
  const summaries = [
    ...(await mrvl.listMatches("live", LIVE_LIMIT)),
    ...(await mrvl.listMatches("recent", RECENT_LIMIT)),
    ...(await mrvl.listMatches("upcoming", LIVE_LIMIT)),
  ];

  const index = await readIndex(store);
  const updated: MatchStats[] = [];
  const mapOverrides: Record<string, MapOverride[]> = {};
  let pagesRequested = 0;
  let indexChanged = false;

  // Series mrvl changed go first, so a backfill never delays a live score.
  const work = candidates
    .flatMap((match) => {
      const summary = findMrvlMatch(match, summaries);

      if (!summary) return [];
      const sourceUpdatedAt = String(summary.updatedAt ?? "");
      const changed = index[match.id]?.sourceUpdatedAt !== sourceUpdatedAt;

      if (!changed && !needsBackfill(index[match.id])) return [];

      return [{ match, summary, sourceUpdatedAt, changed }];
    })
    .sort((a, b) => Number(b.changed) - Number(a.changed));

  for (const { match, summary, sourceUpdatedAt } of work) {
    if (pagesRequested >= MAX_PAGES_PER_SYNC) break;
    pagesRequested++;
    const page = await seriesPage(mrvl, summary.id);

    if (!page) continue;

    const parsed = MatchStatsSchema.safeParse(
      toMatchStats(match, page, sourceUpdatedAt, new Date(now)),
    );

    index[match.id] = {
      sourceMatchId: summary.id,
      sourceUpdatedAt,
      draftOrder: true,
      heroLines: true,
    };
    indexChanged = true;

    // Indexed anyway: refetching can't help until mrvl updates the series.
    if (!parsed.success) {
      console.warn("Skipping mrvl stats that fail our schema", {
        id: summary.id,
        issues: parsed.error.issues.slice(0, 3),
      });

      continue;
    }

    const stats = parsed.data;

    if (stats.maps.length === 0) continue;
    mapOverrides[match.id] = toMapOverrides(stats);

    if (statsChanged(await readMatchStats(store, match.id), stats)) updated.push(stats);
  }

  return { updated, mapOverrides, index: indexChanged ? index : null };
}

export async function writeMatchStats(store: KvStore, stats: MatchStats[]): Promise<void> {
  for (const s of stats) await store.put(statsKey(s.matchId), s);
}

export async function writeStatsIndex(store: KvStore, index: StatsIndex): Promise<void> {
  await store.put(STATS_INDEX_KEY, index);
}
