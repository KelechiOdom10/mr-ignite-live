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

// Free KV allows 1,000 writes a day and each backfilled series costs a stats write plus an index
// rewrite, so backfill gets a small share of each run, and only for series mrvl's recent list can
// still hold.
const MAX_BACKFILL_PER_SYNC = 2;
const BACKFILL_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

// Without a limit, a series whose page keeps failing would keep every run calling mrvl forever.
// One mrvl's recent list doesn't hold has dropped off it for good, so it gets no second try.
const MAX_BACKFILL_ATTEMPTS = 3;

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

/** Failed backfill attempts per never-fetched series. */
const BackfillMissesSchema = z.record(z.string(), z.number().int().positive());

export type BackfillMisses = z.infer<typeof BackfillMissesSchema>;

export const BACKFILL_MISSES_KEY = kvKey("stats-backfill-misses:v1", BackfillMissesSchema);

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

async function readMisses(store: KvStore): Promise<BackfillMisses> {
  const parsed = await store.get(BACKFILL_MISSES_KEY);

  return parsed?.success ? parsed.data : {};
}

/** Indexed before draft order or per-hero lines were kept: worth one refetch while in lookback. */
function needsBackfill(entry: StatsIndex[string] | undefined): boolean {
  return entry !== undefined && (entry.draftOrder !== true || entry.heroLines !== true);
}

function startedAgo(m: Match, now: number): number {
  return m.startsAt ? now - Date.parse(m.startsAt) : Number.POSITIVE_INFINITY;
}

/** A finished series past the lookback that was never fetched and still has attempts left. */
function isBackfill(m: Match, now: number, index: StatsIndex, misses: BackfillMisses): boolean {
  const ago = startedAgo(m, now);

  return (
    matchState(m, now).status === "finished" &&
    index[m.id] === undefined &&
    ago >= LOOKBACK_MS &&
    ago < BACKFILL_WINDOW_MS &&
    (misses[m.id] ?? 0) < MAX_BACKFILL_ATTEMPTS
  );
}

function statsCandidates(
  snapshot: Snapshot,
  now: number,
  index: StatsIndex,
  misses: BackfillMisses,
): Match[] {
  return snapshot.matches.filter((m) => {
    const status = matchState(m, now).status;

    if (status === "live") return true;

    if (status === "finished" && startedAgo(m, now) < LOOKBACK_MS) return true;

    return isBackfill(m, now, index, misses);
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
  /** Null when no backfill attempt failed. */
  misses: BackfillMisses | null;
}

export function noStatsChanges(): StatsChanges {
  return { updated: [], mapOverrides: {}, index: null, misses: null };
}

/** Drops counts for series that left the snapshot or the backfill window, so the record stays small. */
function stillRelevant(
  misses: BackfillMisses,
  snapshot: Snapshot,
  now: number,
  index: StatsIndex,
): BackfillMisses {
  const kept = snapshot.matches.filter(
    (m) =>
      misses[m.id] !== undefined &&
      index[m.id] === undefined &&
      startedAgo(m, now) < BACKFILL_WINDOW_MS,
  );

  return Object.fromEntries(kept.map((m) => [m.id, misses[m.id] ?? 0]));
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
  const index = await readIndex(store);
  const misses = await readMisses(store);
  const candidates = statsCandidates(snapshot, now, index, misses);

  if (candidates.length === 0) return noStatsChanges();

  // mrvl can list a just-finished series under "upcoming" for a while, so search all three lists.
  const summaries = [
    ...(await mrvl.listMatches("live", LIVE_LIMIT)),
    ...(await mrvl.listMatches("recent", RECENT_LIMIT)),
    ...(await mrvl.listMatches("upcoming", LIVE_LIMIT)),
  ];

  const updated: MatchStats[] = [];
  const mapOverrides: Record<string, MapOverride[]> = {};
  let pagesRequested = 0;
  let backfillsRequested = 0;
  let indexChanged = false;
  let missesChanged = false;

  const miss = (id: string, attempts = (misses[id] ?? 0) + 1) => {
    misses[id] = attempts;
    missesChanged = true;
  };

  // Series mrvl changed go first, so a backfill never delays a live score.
  const work = candidates
    .flatMap((match) => {
      const backfill = isBackfill(match, now, index, misses);
      const summary = findMrvlMatch(match, summaries);

      if (!summary) {
        if (backfill) miss(match.id, MAX_BACKFILL_ATTEMPTS);

        return [];
      }

      const sourceUpdatedAt = String(summary.updatedAt ?? "");
      const changed = index[match.id]?.sourceUpdatedAt !== sourceUpdatedAt;

      if (!changed && !needsBackfill(index[match.id])) return [];

      return [{ match, summary, sourceUpdatedAt, urgent: changed && !backfill, backfill }];
    })
    .sort(
      (a, b) =>
        Number(b.urgent) - Number(a.urgent) ||
        (b.match.startsAt ?? "").localeCompare(a.match.startsAt ?? ""),
    );

  for (const { match, summary, sourceUpdatedAt, backfill } of work) {
    if (pagesRequested >= MAX_PAGES_PER_SYNC) break;

    if (backfill && backfillsRequested >= MAX_BACKFILL_PER_SYNC) continue;
    pagesRequested++;

    if (backfill) backfillsRequested++;
    const page = await seriesPage(mrvl, summary.id);

    if (!page) {
      if (backfill) miss(match.id);

      continue;
    }

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

  return {
    updated,
    mapOverrides,
    index: indexChanged ? index : null,
    misses: missesChanged ? stillRelevant(misses, snapshot, now, index) : null,
  };
}

export async function writeMatchStats(store: KvStore, stats: MatchStats[]): Promise<void> {
  for (const s of stats) await store.put(statsKey(s.matchId), s);
}

export async function writeStatsIndex(store: KvStore, index: StatsIndex): Promise<void> {
  await store.put(STATS_INDEX_KEY, index);
}

export async function writeBackfillMisses(store: KvStore, misses: BackfillMisses): Promise<void> {
  await store.put(BACKFILL_MISSES_KEY, misses);
}
