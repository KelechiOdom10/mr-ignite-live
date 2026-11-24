import { z } from "zod";

import {
  type MapOverride,
  type MapResult,
  type Group,
  type Match,
  type PageData,
  type Snapshot,
  type SnapshotEvent,
  type StoredSnapshot,
  type TeamInfo,
} from "@/domain/model";
import { MapOverrideSchema, STORED_SNAPSHOT_VERSION } from "@/domain/model";
import { bracketPlacings, fillPlacings } from "@/domain/prizePlacings";
import { type MatchStats, MatchStatsSchema } from "@/domain/stats";
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
  /** Changed beyond this run's share; their stored revids stay old, so the next run picks them up. */
  deferred: string[];
  removed: string[];
}

export function planSync(
  pages: StoredSnapshot["pages"],
  revisions: ReadonlyMap<string, Revision>,
  maxChanged: number,
): SyncPlan {
  const changed = [...revisions].flatMap(([title, rev]) =>
    pages[title]?.revid === rev.revid ? [] : [title],
  );

  const removed = Object.keys(pages).filter((title) => !revisions.has(title));

  return { changed: changed.slice(0, maxChanged), deferred: changed.slice(maxChanged), removed };
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
    byIndex.set(o.index, {
      ...o,
      map: existing?.map || o.map,
      vod: existing?.vod ?? null,
      early: true,
    });
  }

  return [...byIndex.values()].sort((a, b) => a.index - b.index);
}

// Zod rebuilds objects in schema key order, so a value built in code and the same value read back
// from KV serialise alike.
function sameValue<T>(schema: z.ZodType<T>, a: T, b: T): boolean {
  return JSON.stringify(schema.parse(a)) === JSON.stringify(schema.parse(b));
}

export function withMapOverrides(
  stored: StoredSnapshot,
  incoming: Record<string, MapOverride[]>,
): StoredSnapshot | null {
  const changed = Object.entries(incoming).filter(
    ([matchId, overrides]) =>
      !sameValue(z.array(MapOverrideSchema).optional(), stored.mapOverrides[matchId], overrides),
  );

  if (changed.length === 0) return null;

  return { ...stored, mapOverrides: { ...stored.mapOverrides, ...Object.fromEntries(changed) } };
}

export interface LiquipediaChanges {
  updates: Record<string, PageData>;
  removed: string[];
  teams: Record<string, TeamInfo>;
  /** Changed pages left for the next run. */
  deferred: string[];
}

export function applyLiquipedia(
  stored: StoredSnapshot,
  changes: LiquipediaChanges,
): StoredSnapshot {
  return {
    ...stored,
    pages: applyPages(stored.pages, changes.removed, changes.updates),
    teams: { ...stored.teams, ...changes.teams },
  };
}

function hasLiquipediaChanges(changes: LiquipediaChanges): boolean {
  return (
    Object.keys(changes.updates).length > 0 ||
    changes.removed.length > 0 ||
    Object.keys(changes.teams).length > 0
  );
}

/** The snapshot to write after a sync, or null when nothing in it changed. */
export function nextStored({
  prev,
  liquipedia,
  mapOverrides,
  builtAt,
}: {
  prev: StoredSnapshot;
  liquipedia: LiquipediaChanges;
  mapOverrides: Record<string, MapOverride[]>;
  builtAt: Date;
}): StoredSnapshot | null {
  const fromLiquipedia = hasLiquipediaChanges(liquipedia)
    ? applyLiquipedia(prev, liquipedia)
    : null;

  const next = withMapOverrides(fromLiquipedia ?? prev, mapOverrides) ?? fromLiquipedia;

  return next && { ...next, builtAt: builtAt.toISOString() };
}

export function statsChanged(previous: MatchStats | null, next: MatchStats): boolean {
  return (
    previous === null ||
    previous.sourceMatchId !== next.sourceMatchId ||
    !sameValue(MatchStatsSchema.shape.maps, previous.maps, next.maps)
  );
}

export function toSnapshot(stored: StoredSnapshot, servedAt: Date): Snapshot {
  const events: SnapshotEvent[] = [];
  const matches: Match[] = [];
  const allGroups: Group[] = [];
  let liquipediaUpdatedAt: string | null = null;

  const withShort = (team: Match["team1"]) =>
    team ? { ...team, short: stored.teams[team.name]?.short ?? team.short } : null;

  for (const [title, page] of Object.entries(stored.pages)) {
    if (page.event) events.push({ ...page.event, prizesFromBracket: false });

    if (!liquipediaUpdatedAt || page.updatedAt > liquipediaUpdatedAt) {
      liquipediaUpdatedAt = page.updatedAt;
    }

    allGroups.push(...page.groups);

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

  const withPrizes = events.map((event) => {
    const groups = bracketPlacings(
      matches.filter((m) => m.eventId === event.id),
      servedAt.getTime(),
    );

    if (!groups) return event;
    const { prizes, derived } = fillPlacings(event.prizes, groups);

    return { ...event, prizes, prizesFromBracket: derived };
  });

  return {
    builtAt: stored.builtAt,
    servedAt: servedAt.toISOString(),
    liquipediaUpdatedAt,
    events: withPrizes.sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? "")),
    matches: matches.sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? "")),
    groups: allGroups,
    teams: stored.teams,
  };
}
