import type { Snapshot, StoredSnapshot } from "@/domain/model";
import type { LiquipediaClient } from "@/liquipedia/client";
import type { MrvlClient } from "@/mrvl/client";

import type { KvStore } from "./kv";
import { toSnapshot, withMapOverrides } from "./plan";
import { syncFromLiquipedia, writeStored } from "./snapshot";
import { syncStats } from "./stats";

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
  removedPages: number;
  newTeams: number;
  updatedStats: number;
}

async function withStats(deps: SyncDeps, stored: StoredSnapshot) {
  try {
    const now = deps.now();
    const result = await syncStats({
      store: deps.store,
      mrvl: deps.mrvl,
      snapshot: toSnapshot(stored, new Date(now)),
      now,
    });
    const next = withMapOverrides(stored, result.mapOverrides);
    if (!next) return { stored, updatedStats: result.updatedMatchIds.length };
    await writeStored(deps.store, next);
    return { stored: next, updatedStats: result.updatedMatchIds.length };
  } catch (error) {
    console.error("mrvl stats sync failed; scores still come from Liquipedia", error);
    return { stored, updatedStats: 0 };
  }
}

export async function syncOnce(deps: SyncDeps): Promise<SyncOutcome> {
  const result = await syncFromLiquipedia(deps.liquipedia, deps.store);
  const { stored, updatedStats } = await withStats(deps, result.stored);
  return {
    snapshot: toSnapshot(stored, new Date(deps.now())),
    changed: result.changedPages > 0 || result.removedPages > 0 || updatedStats > 0,
    changedPages: result.changedPages,
    removedPages: result.removedPages,
    newTeams: result.newTeams,
    updatedStats,
  };
}
