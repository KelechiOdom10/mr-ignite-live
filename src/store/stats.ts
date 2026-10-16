import { kv } from "void/kv";
import { z } from "zod";

import { matchState } from "@/domain/matchState";
import type { MapOverride, Match, Snapshot } from "@/domain/model";
import { MatchStatsSchema, type MatchStats } from "@/domain/stats";
import { findMrvlMatch, toMapOverrides, toMatchStats } from "@/mrvl/align";
import type { MrvlClient } from "@/mrvl/client";

const STATS_PREFIX = "stats:v1:";
const INDEX_KEY = "stats-index:v1";
const RECENT_LIMIT = 40;
const LIVE_LIMIT = 20;
const MAX_PAGES_PER_SYNC = 6;
const LOOKBACK_MS = 12 * 60 * 60 * 1000;

const StatsIndexSchema = z.record(
  z.string(),
  z.object({ sourceMatchId: z.string(), sourceUpdatedAt: z.string() }),
);
type StatsIndex = z.infer<typeof StatsIndexSchema>;

export async function readStats(matchId: string): Promise<MatchStats | null> {
  const parsed = MatchStatsSchema.safeParse(await kv.get<unknown>(STATS_PREFIX + matchId));
  return parsed.success ? parsed.data : null;
}

async function readIndex(): Promise<StatsIndex> {
  const parsed = StatsIndexSchema.safeParse(await kv.get<unknown>(INDEX_KEY));
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

export async function syncStats(
  mrvl: MrvlClient,
  snapshot: Snapshot,
  now: number,
): Promise<StatsSyncResult> {
  const candidates = statsCandidates(snapshot, now);
  if (candidates.length === 0) return { updatedMatchIds: [], mapOverrides: {} };

  // mrvl can list a just-finished series under "upcoming" for a while, so search all three lists.
  const summaries = [
    ...(await mrvl.listMatches("live", LIVE_LIMIT)),
    ...(await mrvl.listMatches("recent", RECENT_LIMIT)),
    ...(await mrvl.listMatches("upcoming", LIVE_LIMIT)),
  ];
  const index = await readIndex();
  const updatedMatchIds: string[] = [];
  const mapOverrides: Record<string, MapOverride[]> = {};

  for (const match of candidates) {
    if (updatedMatchIds.length >= MAX_PAGES_PER_SYNC) break;
    const summary = findMrvlMatch(match, summaries);
    if (!summary) continue;
    const sourceUpdatedAt = String(summary.updatedAt ?? "");
    if (index[match.id]?.sourceUpdatedAt === sourceUpdatedAt) continue;

    const stats = toMatchStats(
      match,
      await mrvl.matchPage(summary.id),
      sourceUpdatedAt,
      new Date(now),
    );
    index[match.id] = { sourceMatchId: summary.id, sourceUpdatedAt };
    updatedMatchIds.push(match.id);
    if (stats.maps.length === 0) continue;
    await kv.put(STATS_PREFIX + match.id, stats);
    mapOverrides[match.id] = toMapOverrides(stats);
  }

  if (updatedMatchIds.length > 0) await kv.put(INDEX_KEY, index);
  return { updatedMatchIds, mapOverrides };
}
