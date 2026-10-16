import type { Snapshot } from "./data/model";
import { readStored, syncFromLiquipedia, toSnapshot } from "./data/store";
import { live, SCORES_TOPIC } from "./live";

const DEV_SYNC_INTERVAL_MS = 60_000;
let inFlight: Promise<Snapshot> | null = null;
let lastDevSync = 0;

export async function sync(): Promise<Snapshot> {
  inFlight ??= (async () => {
    try {
      const { changed, stored } = await syncFromLiquipedia();
      const snapshot = toSnapshot(stored);
      if (changed)
        await live.publish(
          SCORES_TOPIC,
          { builtAt: snapshot.builtAt },
          { type: "updated", eventId: snapshot.builtAt },
        );
      return snapshot;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

// Cron triggers don't fire under `vite dev`, so reads drive syncing locally.
export async function currentSnapshot(): Promise<Snapshot> {
  const stored = await readStored();
  const devDue = import.meta.env.DEV && Date.now() - lastDevSync > DEV_SYNC_INTERVAL_MS;
  if (!stored || devDue) {
    lastDevSync = Date.now();
    try {
      return await sync();
    } catch (error) {
      if (!stored) throw error;
      console.error("Liquipedia sync failed, serving stored snapshot", error);
    }
  }
  return toSnapshot(stored!);
}
