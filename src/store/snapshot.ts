import { kv } from "void/kv";
import { z } from "zod";

import { StoredSnapshotSchema, type PageData, type StoredSnapshot } from "@/domain/model";
import type { LiquipediaClient } from "@/liquipedia/client";
import { parseEventInfo, parsePageMatches } from "@/liquipedia/parse";
import { fetchTeamInfo } from "@/liquipedia/teams";

import { applyPages, emptyStored, planSync, teamsMissingInfo } from "./plan";

const SNAPSHOT_KEY = "snapshot";
const TITLES_KEY = "titles:v1";
const TITLES_TTL_SECONDS = 30 * 60;
const PAGE_PREFIX = "MR Ignite/2026";

export async function writeStored(stored: StoredSnapshot): Promise<void> {
  await kv.put(SNAPSHOT_KEY, StoredSnapshotSchema.parse(stored));
}

export async function readStored(): Promise<StoredSnapshot | null> {
  const raw = await kv.get<unknown>(SNAPSHOT_KEY);
  if (raw === null) return null;
  const parsed = StoredSnapshotSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  console.warn("Discarding stored snapshot that fails the current schema", {
    issues: parsed.error.issues.slice(0, 3),
  });
  return null;
}

async function pageTitles(client: LiquipediaClient): Promise<string[]> {
  const cached = z.array(z.string()).safeParse(await kv.get<unknown>(TITLES_KEY));
  if (cached.success) return cached.data;
  const titles = await client.listPages(PAGE_PREFIX);
  await kv.put(TITLES_KEY, titles, { ttl: TITLES_TTL_SECONDS });
  return titles;
}

const EVENT_ICON_WIDTH_PX = 64;

async function resolveEventIcons(
  client: LiquipediaClient,
  pages: Record<string, PageData>,
): Promise<void> {
  const events = Object.values(pages).flatMap((p) => (p.event?.iconFile ? [p.event] : []));
  if (events.length === 0) return;
  const urls = await client.imageUrls(
    [...new Set(events.map((e) => e.iconFile ?? ""))],
    EVENT_ICON_WIDTH_PX,
  );
  for (const event of events) {
    event.iconUrl = event.iconFile ? (urls.get(event.iconFile) ?? null) : null;
  }
}

export interface SyncResult {
  stored: StoredSnapshot;
  changedPages: number;
  removedPages: number;
  newTeams: number;
}

export async function syncFromLiquipedia(client: LiquipediaClient): Promise<SyncResult> {
  const prev = (await readStored()) ?? emptyStored();
  const revisions = await client.fetchRevisions(await pageTitles(client));
  const plan = planSync(prev.pages, revisions);
  if (plan.changed.length === 0 && plan.removed.length === 0) {
    return { stored: prev, changedPages: 0, removedPages: 0, newTeams: 0 };
  }

  const updates: Record<string, PageData> = {};
  for (const [title, text] of await client.fetchContents(plan.changed)) {
    const rev = revisions.get(title);
    if (!rev) continue;
    updates[title] = {
      revid: rev.revid,
      updatedAt: rev.timestamp,
      event: parseEventInfo(title, text, rev.timestamp),
      matches: parsePageMatches(title, text),
    };
  }
  await resolveEventIcons(client, updates);
  const pages = applyPages(prev.pages, plan.removed, updates);
  const missing = teamsMissingInfo(pages, prev.teams);
  const teams = missing.length
    ? { ...prev.teams, ...(await fetchTeamInfo(client, missing)) }
    : prev.teams;

  const stored = StoredSnapshotSchema.parse({
    ...prev,
    pages,
    teams,
    builtAt: new Date().toISOString(),
  });
  await kv.put(SNAPSHOT_KEY, stored);
  return {
    stored,
    changedPages: Object.keys(updates).length,
    removedPages: plan.removed.length,
    newTeams: missing.length,
  };
}
