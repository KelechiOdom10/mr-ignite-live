import type { Snapshot, StoredSnapshot } from "@/domain/model";
import type { LiquipediaClient } from "@/liquipedia/client";
import type { MrvlClient } from "@/mrvl/client";

import type { KvStore } from "./kv";
import { applyLiquipedia, emptyStored, nextStored, toSnapshot } from "./plan";
import { fetchLiquipediaChanges, readStored, writeStored } from "./snapshot";
import {
  fetchStatsChanges,
  NO_STATS_CHANGES,
  type StatsChanges,
  writeMatchStats,
  writeStatsIndex,
} from "./stats";

// The 2s gap is per isolate, and the cron fires every 60s whether or not the last run finished.
// Stopping new Liquipedia requests at 30s, after at most 8, keeps runs in different isolates
// from overlapping; anything left over is still changed in KV, so the next run picks it up.
const LIQUIPEDIA_REQUESTS_PER_RUN = 8;
const LIQUIPEDIA_RUN_WINDOW_MS = 30_000;

export interface SyncDeps {
  store: KvStore;
  liquipedia: LiquipediaClient;
  mrvl: MrvlClient;
  now: () => number;
}

export interface SyncOutcome {
  snapshot: Snapshot;
  /** Readers would see something new, so open pages should refetch. */
  changed: boolean;
  changedPages: number;
  deferredPages: number;
  removedPages: number;
  newTeams: number;
  updatedStats: number;
}

async function statsOrNothing(deps: SyncDeps, stored: StoredSnapshot): Promise<StatsChanges> {
  try {
    const now = deps.now();
    return await fetchStatsChanges({
      store: deps.store,
      mrvl: deps.mrvl,
      snapshot: toSnapshot(stored, new Date(now)),
      now,
    });
  } catch (error) {
    console.error("mrvl stats sync failed; scores still come from Liquipedia", error);
    return NO_STATS_CHANGES;
  }
}

export async function syncOnce(deps: SyncDeps): Promise<SyncOutcome> {
  const { store } = deps;
  const prev = (await readStored(store)) ?? emptyStored();
  const liquipedia = await fetchLiquipediaChanges({
    liquipedia: deps.liquipedia.startRun({
      maxRequests: LIQUIPEDIA_REQUESTS_PER_RUN,
      deadlineAt: deps.now() + LIQUIPEDIA_RUN_WINDOW_MS,
    }),
    store,
    prev,
  });
  const stats = await statsOrNothing(deps, applyLiquipedia(prev, liquipedia));
  const next = nextStored({
    prev,
    liquipedia,
    mapOverrides: stats.mapOverrides,
    builtAt: new Date(deps.now()),
  });

  await writeMatchStats(store, stats.updated);
  if (next) await writeStored(store, next);
  // Last, so a run that fails before here refetches those series and re-emits their map results.
  if (stats.index) await writeStatsIndex(store, stats.index);

  return {
    snapshot: toSnapshot(next ?? prev, new Date(deps.now())),
    changed: next !== null || stats.updated.length > 0,
    changedPages: Object.keys(liquipedia.updates).length,
    deferredPages: liquipedia.deferred.length,
    removedPages: liquipedia.removed.length,
    newTeams: Object.keys(liquipedia.teams).length,
    updatedStats: stats.updated.length,
  };
}
