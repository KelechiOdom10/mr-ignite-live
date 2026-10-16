import { type Snapshot } from "@/domain/model";
import { createLiquipediaClient } from "@/liquipedia/client";
import { toSnapshot } from "@/store/plan";
import { readStored, syncFromLiquipedia } from "@/store/snapshot";

import { live, SCORES_TOPIC } from "./live";

const DEV_SYNC_INTERVAL_MS = 60_000;
const liquipedia = createLiquipediaClient();
let inFlight: Promise<Snapshot> | null = null;
let lastDevSync = 0;

async function runSync(): Promise<Snapshot> {
  const started = Date.now();
  const result = await syncFromLiquipedia(liquipedia);
  const snapshot = toSnapshot(result.stored, new Date());
  if (result.changedPages > 0 || result.removedPages > 0) {
    await live.publish(
      SCORES_TOPIC,
      { builtAt: snapshot.builtAt },
      { type: "updated", eventId: snapshot.builtAt },
    );
  }
  console.info(
    JSON.stringify({
      event: "liquipedia.sync",
      changedPages: result.changedPages,
      removedPages: result.removedPages,
      newTeams: result.newTeams,
      durationMs: Date.now() - started,
    }),
  );
  return snapshot;
}

// Concurrent callers in one isolate share a run. Across isolates two runs can overlap;
// both write the same Liquipedia revisions, so the last write is still correct.
export function sync(): Promise<Snapshot> {
  inFlight ??= runSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

// Cron triggers don't fire under `vite dev`, so reads drive syncing locally.
export async function currentSnapshot(): Promise<Snapshot> {
  const stored = await readStored();
  const devDue = import.meta.env.DEV && Date.now() - lastDevSync > DEV_SYNC_INTERVAL_MS;
  if (stored && !devDue) return toSnapshot(stored, new Date());

  lastDevSync = Date.now();
  try {
    return await sync();
  } catch (error) {
    if (!stored) throw error;
    console.error("Liquipedia sync failed, serving stored snapshot", error);
    return toSnapshot(stored, new Date());
  }
}
