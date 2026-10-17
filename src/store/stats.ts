import { z } from "zod";

import { matchState } from "@/domain/matchState";
import type { MapOverride, Match, Snapshot } from "@/domain/model";
import { MatchStatsSchema, type MatchStats } from "@/domain/stats";
import { findMrvlMatch, toMapOverrides, toMatchStats } from "@/mrvl/align";
import type { MrvlClient } from "@/mrvl/client";

import type { KvStore } from "./kv";
import { statsChanged } from "./plan";
import { voidKvStore } from "./voidKv";

const STATS_PREFIX = "stats:v2:";
const INDEX_KEY = "stats-index:v2";
const RECENT_LIMIT = 40;
const LIVE_LIMIT = 20;
const MAX_PAGES_PER_SYNC = 6;
const LOOKBACK_MS = 12 * 60 * 60 * 1000;

const StatsIndexSchema = z.record(
  z.string(),
  z.object({ sourceMatchId: z.string(), sourceUpdatedAt: z.string() }),
);
type StatsIndex = z.infer<typeof StatsIndexSchema>;

export async function readMatchStats(store: KvStore, matchId: string): Promise<MatchStats | null> {
  const parsed = MatchStatsSchema.safeParse(await store.get(STATS_PREFIX + matchId));
  return parsed.success ? parsed.data : null;
}

/** For route and page loaders, which always read the deployed KV. */
export function readStats(matchId: string): Promise<MatchStats | null> {
  return readMatchStats(voidKvStore, matchId);
}

async function readIndex(store: KvStore): Promise<StatsIndex> {
  const parsed = StatsIndexSchema.safeParse(await store.get(INDEX_KEY));
  return parsed.success ? parsed.data : {};
}

export function statsCandidates(snapshot: Snapshot, now: number): Match[] {
  return snapshot.matches.filter((m) => {
    const status = matchState(m, now).status;
    if (status === "live") return true;
    if (status !== "finished" || !m.startsAt) return false;
    return now - Date.parse(m.startsAt) < LOOKBACK_MS;
  });
}

export interface StatsSyncResult {
  updatedMatchIds: string[];
  mapOverrides: Record<string, MapOverride[]>;
}

export async function syncStats({
  store,
  mrvl,
  snapshot,
  now,
}: {
  store: KvStore;
  mrvl: MrvlClient;
  snapshot: Snapshot;
  now: number;
}): Promise<StatsSyncResult> {
  const candidates = statsCandidates(snapshot, now);
  if (candidates.length === 0) return { updatedMatchIds: [], mapOverrides: {} };

  // mrvl can list a just-finished series under "upcoming" for a while, so search all three lists.
  const summaries = [
    ...(await mrvl.listMatches("live", LIVE_LIMIT)),
    ...(await mrvl.listMatches("recent", RECENT_LIMIT)),
    ...(await mrvl.listMatches("upcoming", LIVE_LIMIT)),
  ];
  const index = await readIndex(store);
  const updatedMatchIds: string[] = [];
  const mapOverrides: Record<string, MapOverride[]> = {};
  let indexChanged = false;
  let pagesFetched = 0;

  for (const match of candidates) {
    if (pagesFetched >= MAX_PAGES_PER_SYNC) break;
    const summary = findMrvlMatch(match, summaries);
    if (!summary) continue;
    const sourceUpdatedAt = String(summary.updatedAt ?? "");
    if (index[match.id]?.sourceUpdatedAt === sourceUpdatedAt) continue;

    pagesFetched++;
    const stats = toMatchStats(
      match,
      await mrvl.matchPage(summary.id),
      sourceUpdatedAt,
      new Date(now),
    );
    index[match.id] = { sourceMatchId: summary.id, sourceUpdatedAt };
    indexChanged = true;
    if (stats.maps.length === 0 || !statsChanged(await readMatchStats(store, match.id), stats))
      continue;
    await store.put(STATS_PREFIX + match.id, stats);
    updatedMatchIds.push(match.id);
    mapOverrides[match.id] = toMapOverrides(stats);
  }

  if (indexChanged) await store.put(INDEX_KEY, index);
  return { updatedMatchIds, mapOverrides };
}
