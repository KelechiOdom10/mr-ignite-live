import type { Snapshot } from "@/domain/model";
import type { MatchStats } from "@/domain/stats";
import { createLiquipediaClient } from "@/liquipedia/client";
import { createMrvlClient } from "@/mrvl/client";
import { toSnapshot } from "@/store/plan";
import { syncOnce } from "@/store/run";
import { readStored } from "@/store/snapshot";
import { readMatchStats } from "@/store/stats";
import { voidKvStore } from "@/store/voidKv";

import { live, SCORES_TOPIC } from "./live";

const DEV_SYNC_INTERVAL_MS = 60_000;
const FAILURE_BACKOFF_MS = 60_000;
const liquipedia = createLiquipediaClient();
const mrvl = createMrvlClient();
let inFlight: Promise<Snapshot> | null = null;
let lastDevSync = 0;
let lastFailureAt = Number.NEGATIVE_INFINITY;

async function runSync(): Promise<Snapshot> {
  const started = Date.now();
  const { snapshot, changed, ...counts } = await syncOnce({
    store: voidKvStore,
    liquipedia,
    mrvl,
    now: Date.now,
  });
  if (changed) {
    await live.publish(
      SCORES_TOPIC,
      { builtAt: snapshot.builtAt },
      { type: "updated", eventId: `${snapshot.builtAt}:${Date.now()}` },
    );
  }
  console.info(JSON.stringify({ event: "sync", ...counts, durationMs: Date.now() - started }));
  return snapshot;
}

// Runs in separate isolates can still overlap after their Liquipedia window, and each writes a
// whole snapshot built from what it read, so the later write wins. Page revisions converge on the
// next run, but mrvl map results only the earlier run saw can be lost until mrvl updates the series.
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
  const stored = await readStored(voidKvStore);
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

export function readStats(matchId: string): Promise<MatchStats | null> {
  return readMatchStats(voidKvStore, matchId);
}
