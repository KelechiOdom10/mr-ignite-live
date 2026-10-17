import { z } from "zod";

import { StoredSnapshotSchema, type PageData, type StoredSnapshot } from "@/domain/model";
import { LiquipediaBudgetSpentError, type LiquipediaRun, type Revision } from "@/liquipedia/client";
import { parseEventInfo, parsePageMatches } from "@/liquipedia/parse";
import { fetchTeamInfo } from "@/liquipedia/teams";

import type { KvStore } from "./kv";
import { applyPages, type LiquipediaChanges, planSync, teamsMissingInfo } from "./plan";

const SNAPSHOT_KEY = "snapshot";
const TITLES_KEY = "titles:v1";
const TITLES_TTL_SECONDS = 30 * 60;
const PAGE_PREFIX = "MR Ignite/2026";
// Sized so a run's worst case fits its request budget: one contents and one icon request for the
// pages, one template expansion and at most two logo lookups for the teams.
const PAGES_PER_RUN = 50;
const TEAMS_PER_RUN = 40;

export async function writeStored(store: KvStore, stored: StoredSnapshot): Promise<void> {
  await store.put(SNAPSHOT_KEY, StoredSnapshotSchema.parse(stored));
}

export async function readStored(store: KvStore): Promise<StoredSnapshot | null> {
  const raw = await store.get(SNAPSHOT_KEY);
  if (raw === null) return null;
  const parsed = StoredSnapshotSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  console.warn("Discarding stored snapshot that fails the current schema", {
    issues: parsed.error.issues.slice(0, 3),
  });
  return null;
}

async function pageTitles(liquipedia: LiquipediaRun, store: KvStore): Promise<string[]> {
  const cached = z.array(z.string()).safeParse(await store.get(TITLES_KEY));
  if (cached.success) return cached.data;
  const titles = await liquipedia.listPages(PAGE_PREFIX);
  await store.put(TITLES_KEY, titles, { ttl: TITLES_TTL_SECONDS });
  return titles;
}

const EVENT_ICON_WIDTH_PX = 64;

async function resolveEventIcons(
  liquipedia: LiquipediaRun,
  pages: Record<string, PageData>,
): Promise<void> {
  const events = Object.values(pages).flatMap((p) => (p.event?.iconFile ? [p.event] : []));
  if (events.length === 0) return;
  const urls = await liquipedia.imageUrls(
    [...new Set(events.map((e) => e.iconFile ?? ""))],
    EVENT_ICON_WIDTH_PX,
  );
  for (const event of events) {
    event.iconUrl = event.iconFile ? (urls.get(event.iconFile) ?? null) : null;
  }
}

async function unlessBudgetSpent<T>(work: () => Promise<T>, deferred: T): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof LiquipediaBudgetSpentError) return deferred;
    throw error;
  }
}

// Icons are only looked up when a page's revision changes, so a page commits with its icon or
// not at all; committing it without one would leave the icon missing until the next edit.
async function fetchPages(
  liquipedia: LiquipediaRun,
  titles: string[],
  revisions: ReadonlyMap<string, Revision>,
): Promise<Record<string, PageData>> {
  const updates: Record<string, PageData> = {};
  for (const [title, text] of await liquipedia.fetchContents(titles)) {
    const rev = revisions.get(title);
    if (!rev) continue;
    updates[title] = {
      revid: rev.revid,
      updatedAt: rev.timestamp,
      event: parseEventInfo(title, text, rev.timestamp),
      matches: parsePageMatches(title, text),
    };
  }
  await resolveEventIcons(liquipedia, updates);
  return updates;
}

export async function fetchLiquipediaChanges({
  liquipedia,
  store,
  prev,
}: {
  liquipedia: LiquipediaRun;
  store: KvStore;
  prev: StoredSnapshot;
}): Promise<LiquipediaChanges> {
  const revisions = await liquipedia.fetchRevisions(await pageTitles(liquipedia, store));
  const plan = planSync(prev.pages, revisions, PAGES_PER_RUN);
  const updates = await unlessBudgetSpent(
    () => fetchPages(liquipedia, plan.changed, revisions),
    {},
  );

  const missing = teamsMissingInfo(applyPages(prev.pages, plan.removed, updates), prev.teams);
  const teams =
    missing.length > 0
      ? await unlessBudgetSpent(
          () => fetchTeamInfo(liquipedia, missing.slice(0, TEAMS_PER_RUN)),
          {},
        )
      : {};

  return {
    updates,
    removed: plan.removed,
    teams,
    deferred: [...plan.changed.filter((title) => !updates[title]), ...plan.deferred],
  };
}
