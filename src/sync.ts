import type { Snapshot, StoredSnapshot } from "@/domain/model";
import { createLiquipediaClient } from "@/liquipedia/client";
import { createMrvlClient } from "@/mrvl/client";
import { toSnapshot } from "@/store/plan";
import { readStored, syncFromLiquipedia, writeStored } from "@/store/snapshot";
import { syncStats } from "@/store/stats";

import { live, SCORES_TOPIC } from "./live";

const DEV_SYNC_INTERVAL_MS = 60_000;
const FAILURE_BACKOFF_MS = 60_000;
const liquipedia = createLiquipediaClient();
const mrvl = createMrvlClient();
let inFlight: Promise<Snapshot> | null = null;
let lastDevSync = 0;
let lastFailureAt = Number.NEGATIVE_INFINITY;

async function withStats(stored: StoredSnapshot, now: Date) {
  try {
    const result = await syncStats(mrvl, toSnapshot(stored, now), now.getTime());
    if (Object.keys(result.mapOverrides).length === 0) {
      return { stored, updatedStats: result.updatedMatchIds.length };
    }
    const next = { ...stored, mapOverrides: { ...stored.mapOverrides, ...result.mapOverrides } };
    await writeStored(next);
    return { stored: next, updatedStats: result.updatedMatchIds.length };
  } catch (error) {
    console.error("mrvl stats sync failed; scores still come from Liquipedia", error);
    return { stored, updatedStats: 0 };
  }
}

async function runSync(): Promise<Snapshot> {
  const started = Date.now();
  const result = await syncFromLiquipedia(liquipedia);
  const { stored, updatedStats } = await withStats(result.stored, new Date());
  const snapshot = toSnapshot(stored, new Date());
  if (result.changedPages > 0 || result.removedPages > 0 || updatedStats > 0) {
    await live.publish(
      SCORES_TOPIC,
      { builtAt: snapshot.builtAt },
      { type: "updated", eventId: `${snapshot.builtAt}:${Date.now()}` },
    );
  }
  console.info(
    JSON.stringify({
      event: "sync",
      changedPages: result.changedPages,
      removedPages: result.removedPages,
      newTeams: result.newTeams,
      updatedStats,
      durationMs: Date.now() - started,
    }),
  );
  return snapshot;
}

// Runs in separate isolates can overlap; both write the same revisions, so last-write-wins is safe.
export function sync(): Promise<Snapshot> {
  inFlight ??= runSync()
    .catch((error: unknown) => {
      lastFailureAt = Date.now();
      throw error;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export class SyncBackoffError extends Error {
  override name = "SyncBackoffError";
}

// Cron triggers don't fire under `vite dev`, so reads drive syncing locally.
export async function currentSnapshot(): Promise<Snapshot> {
  const stored = await readStored();
  const devDue = import.meta.env.DEV && Date.now() - lastDevSync > DEV_SYNC_INTERVAL_MS;
  if (stored && !devDue) return toSnapshot(stored, new Date());
  // Without this, every request after a failed first sync would refetch all of Liquipedia.
  if (!stored && Date.now() - lastFailureAt < FAILURE_BACKOFF_MS) {
    throw new SyncBackoffError("Waiting before retrying the Liquipedia sync");
  }

  lastDevSync = Date.now();
  try {
    return await sync();
  } catch (error) {
    if (!stored) throw error;
    console.error("Sync failed, serving stored snapshot", error);
    return toSnapshot(stored, new Date());
  }
}
