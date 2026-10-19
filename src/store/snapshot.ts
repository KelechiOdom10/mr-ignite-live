import { z } from "zod";

import { StoredSnapshotSchema, type PageData, type StoredSnapshot } from "@/domain/model";
import { LiquipediaBudgetSpentError, type LiquipediaRun, type Revision } from "@/liquipedia/client";
import { parseEventInfo, parsePageMatches } from "@/liquipedia/parse";
import { fetchTeamInfo } from "@/liquipedia/teams";

import { kvKey, type KvStore } from "./kv";
import { applyPages, type LiquipediaChanges, planSync, teamsMissingInfo } from "./plan";

const SNAPSHOT_KEY = kvKey("snapshot", StoredSnapshotSchema);
const TITLES_KEY = kvKey("titles:v1", z.array(z.string()));
const TITLES_TTL_SECONDS = 30 * 60;
const PAGE_PREFIX = "MR Ignite/2026";

// Sized so a run's worst case fits its request budget: one contents request for the pages, one
// template expansion and at most two logo lookups for the teams, one lookup for event icons.
const PAGES_PER_RUN = 50;
const TEAMS_PER_RUN = 40;
const ICONS_PER_RUN = 50;
const EVENT_ICON_WIDTH_PX = 64;

export async function writeStored(store: KvStore, stored: StoredSnapshot): Promise<void> {
  await store.put(SNAPSHOT_KEY, stored);
}

export async function readStored(store: KvStore): Promise<StoredSnapshot | null> {
  const parsed = await store.get(SNAPSHOT_KEY);

  if (parsed === null) return null;

  if (parsed.success) return parsed.data;
  console.warn("Discarding stored snapshot that fails the current schema", {
    issues: parsed.error.issues.slice(0, 3),
  });

  return null;
}

async function pageTitles(liquipedia: LiquipediaRun, store: KvStore): Promise<string[]> {
  const cached = await store.get(TITLES_KEY);

  if (cached?.success) return cached.data;
  const titles = await liquipedia.listPages(PAGE_PREFIX);
  await store.put(TITLES_KEY, titles, { ttl: TITLES_TTL_SECONDS });

  return titles;
}

async function unlessBudgetSpent<T>(work: () => Promise<T>, deferred: T): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof LiquipediaBudgetSpentError) return deferred;
    throw error;
  }
}

async function fetchPages(
  liquipedia: LiquipediaRun,
  titles: string[],
  revisions: ReadonlyMap<string, Revision>,
  prevPages: StoredSnapshot["pages"],
): Promise<Record<string, PageData>> {
  const updates: Record<string, PageData> = {};

  for (const [title, text] of await liquipedia.fetchContents(titles)) {
    const rev = revisions.get(title);

    if (!rev) continue;
    const event = parseEventInfo(title, text, rev.timestamp);
    const known = prevPages[title]?.event;

    if (event && known?.iconUrl && known.iconFile === event.iconFile) event.iconUrl = known.iconUrl;
    updates[title] = {
      revid: rev.revid,
      updatedAt: rev.timestamp,
      event,
      matches: parsePageMatches(title, text),
    };
  }

  return updates;
}

/**
 * Looks up event icons still pending (a file but no URL), so pages commit as soon as their
 * contents arrive and a run cut short only delays the icon. A file Liquipedia doesn't have is
 * cleared so it isn't looked up every run; the page's next edit re-parses it and tries again.
 */
async function resolvePendingIcons(
  liquipedia: LiquipediaRun,
  pages: StoredSnapshot["pages"],
): Promise<Record<string, PageData>> {
  const pending = Object.entries(pages).filter(([, p]) => p.event?.iconFile && !p.event.iconUrl);

  const files = [...new Set(pending.map(([, p]) => p.event?.iconFile ?? ""))].slice(
    0,
    ICONS_PER_RUN,
  );

  if (files.length === 0) return {};

  const urls = await unlessBudgetSpent(
    () => liquipedia.imageUrls(files, EVENT_ICON_WIDTH_PX),
    null,
  );

  if (!urls) return {};

  const resolved: Record<string, PageData> = {};

  for (const [title, page] of pending) {
    if (!page.event?.iconFile || !files.includes(page.event.iconFile)) continue;
    const iconUrl = urls.get(page.event.iconFile) ?? null;
    resolved[title] = {
      ...page,
      event: { ...page.event, iconUrl, iconFile: iconUrl ? page.event.iconFile : null },
    };
  }

  return resolved;
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

  const fetched = await unlessBudgetSpent(
    () => fetchPages(liquipedia, plan.changed, revisions, prev.pages),
    {},
  );

  const pages = applyPages(prev.pages, plan.removed, fetched);

  // Teams go before icons: a cut-off icon lookup is retried next run, a cut-off logo lookup isn't.
  const missing = teamsMissingInfo(pages, prev.teams);

  const teams =
    missing.length > 0
      ? await unlessBudgetSpent(
          () => fetchTeamInfo(liquipedia, missing.slice(0, TEAMS_PER_RUN)),
          {},
        )
      : {};

  const icons = await resolvePendingIcons(liquipedia, pages);

  return {
    updates: { ...fetched, ...icons },
    removed: plan.removed,
    teams,
    deferred: [...plan.changed.filter((title) => !fetched[title]), ...plan.deferred],
  };
}
