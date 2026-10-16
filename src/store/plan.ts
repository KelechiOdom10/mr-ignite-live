import {
  type IgniteEvent,
  type MapOverride,
  type MapResult,
  type Match,
  type PageData,
  type Snapshot,
  type StoredSnapshot,
} from "@/domain/model";
import { STORED_SNAPSHOT_VERSION } from "@/domain/model";
import type { MatchStats } from "@/domain/stats";
import type { Revision } from "@/liquipedia/client";
import { eventIdFor } from "@/liquipedia/parse";

export function emptyStored(): StoredSnapshot {
  return {
    version: STORED_SNAPSHOT_VERSION,
    pages: {},
    teams: {},
    mapOverrides: {},
    builtAt: new Date(0).toISOString(),
  };
}

export interface SyncPlan {
  changed: string[];
  removed: string[];
}

export function planSync(
  pages: StoredSnapshot["pages"],
  revisions: ReadonlyMap<string, Revision>,
): SyncPlan {
  const changed = [...revisions]
    .filter(([title, rev]) => pages[title]?.revid !== rev.revid)
    .map(([title]) => title);
  const removed = Object.keys(pages).filter((title) => !revisions.has(title));
  return { changed, removed };
}

export function applyPages(
  pages: StoredSnapshot["pages"],
  removed: string[],
  updates: Record<string, PageData>,
): StoredSnapshot["pages"] {
  const next = { ...pages, ...updates };
  for (const title of removed) delete next[title];
  return next;
}

export function teamsMissingInfo(
  pages: StoredSnapshot["pages"],
  known: StoredSnapshot["teams"],
): string[] {
  const names = new Set<string>();
  for (const page of Object.values(pages)) {
    for (const m of page.matches) {
      if (m.team1) names.add(m.team1.name);
      if (m.team2) names.add(m.team2.name);
    }
  }
  return [...names].filter((name) => !known[name]);
}

export function mergeMapOverrides(maps: MapResult[], overrides: MapOverride[]): MapResult[] {
  const byIndex = new Map(maps.map((m) => [m.index, m]));
  for (const o of overrides) {
    const existing = byIndex.get(o.index);
    if (existing && existing.winner !== 0) continue;
    byIndex.set(o.index, { ...o, map: existing?.map || o.map, vod: existing?.vod ?? null });
  }
  return [...byIndex.values()].sort((a, b) => a.index - b.index);
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}

export function withMapOverrides(
  stored: StoredSnapshot,
  incoming: Record<string, MapOverride[]>,
): StoredSnapshot | null {
  const changed = Object.entries(incoming).filter(
    ([matchId, overrides]) =>
      canonicalJson(stored.mapOverrides[matchId]) !== canonicalJson(overrides),
  );
  if (changed.length === 0) return null;
  return { ...stored, mapOverrides: { ...stored.mapOverrides, ...Object.fromEntries(changed) } };
}

export function statsChanged(previous: MatchStats | null, next: MatchStats): boolean {
  return (
    previous === null ||
    previous.sourceMatchId !== next.sourceMatchId ||
    canonicalJson(previous.maps) !== canonicalJson(next.maps)
  );
}

export function toSnapshot(stored: StoredSnapshot, servedAt: Date): Snapshot {
  const events: IgniteEvent[] = [];
  const matches: Match[] = [];
  let liquipediaUpdatedAt: string | null = null;
  const withShort = (team: Match["team1"]) =>
    team ? { ...team, short: stored.teams[team.name]?.short ?? team.short } : null;

  for (const [title, page] of Object.entries(stored.pages)) {
    if (page.event) events.push(page.event);
    if (!liquipediaUpdatedAt || page.updatedAt > liquipediaUpdatedAt) {
      liquipediaUpdatedAt = page.updatedAt;
    }
    for (const m of page.matches) {
      const overrides = stored.mapOverrides[m.id];
      matches.push({
        ...m,
        maps: overrides ? mergeMapOverrides(m.maps, overrides) : m.maps,
        eventId: eventIdFor(title),
        team1: withShort(m.team1),
        team2: withShort(m.team2),
      });
    }
  }

  return {
    builtAt: stored.builtAt,
    servedAt: servedAt.toISOString(),
    liquipediaUpdatedAt,
    events: events.sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? "")),
    matches: matches.sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? "")),
    teams: stored.teams,
  };
}
