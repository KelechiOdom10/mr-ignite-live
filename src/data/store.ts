import { kv } from "void/kv";
import type { IgniteEvent, Match, PageData, Snapshot, StoredSnapshot } from "./model";
import { eventIdFor, fetchContents, fetchRevisions, fetchTeamInfo, listPages, parseEventInfo, parsePageMatches } from "./liquipedia";

const KEY = "snapshot:v2";
const TITLE_LIST_KEY = "titles:v1";

export async function readStored(): Promise<StoredSnapshot | null> {
  return kv.get<StoredSnapshot>(KEY);
}

async function pageTitles(): Promise<string[]> {
  const cached = await kv.get<string[]>(TITLE_LIST_KEY);
  if (cached) return cached;
  const titles = await listPages();
  await kv.put(TITLE_LIST_KEY, titles, { ttl: 30 * 60 });
  return titles;
}

export async function syncFromLiquipedia(): Promise<{ changed: boolean; stored: StoredSnapshot }> {
  const prev = (await readStored()) ?? { pages: {}, teams: {}, builtAt: new Date(0).toISOString() };
  const titles = await pageTitles();
  const revisions = await fetchRevisions(titles);
  const changedTitles = [...revisions].filter(([title, rev]) => prev.pages[title]?.revid !== rev.revid).map(([title]) => title);
  const removed = Object.keys(prev.pages).filter((t) => !revisions.has(t));
  if (changedTitles.length === 0 && removed.length === 0) return { changed: false, stored: prev };

  const pages: Record<string, PageData> = { ...prev.pages };
  for (const t of removed) delete pages[t];
  const contents = await fetchContents(changedTitles);
  for (const [title, text] of contents) {
    const rev = revisions.get(title)!;
    pages[title] = {
      revid: rev.revid,
      updatedAt: rev.timestamp,
      event: parseEventInfo(title, text, rev.timestamp),
      matches: parsePageMatches(title, text),
    };
  }

  const teamNames = new Set(Object.values(pages).flatMap((p) => p.matches.flatMap((m) => [m.team1?.name, m.team2?.name])));
  const missing = [...teamNames].filter((n): n is string => !!n && !prev.teams[n]);
  const teams = missing.length ? { ...prev.teams, ...(await fetchTeamInfo(missing)) } : prev.teams;

  const stored: StoredSnapshot = { pages, teams, builtAt: new Date().toISOString() };
  await kv.put(KEY, stored);
  return { changed: true, stored };
}

export function toSnapshot(stored: StoredSnapshot): Snapshot {
  const pages = Object.entries(stored.pages);
  const events: IgniteEvent[] = [];
  const matches: Match[] = [];
  let latest: string | null = null;
  for (const [title, page] of pages) {
    if (page.event) events.push(page.event);
    if (!latest || page.updatedAt > latest) latest = page.updatedAt;
    for (const m of page.matches) {
      const withShort = (team: Match["team1"]) => (team ? { ...team, short: stored.teams[team.name]?.short ?? team.short } : null);
      matches.push({ ...m, eventId: eventIdFor(title), team1: withShort(m.team1), team2: withShort(m.team2) });
    }
  }
  const eventIds = new Set(events.map((e) => e.id));
  return {
    builtAt: stored.builtAt,
    servedAt: new Date().toISOString(),
    liquipediaUpdatedAt: latest,
    events: events.filter((e) => eventIds.has(e.id)).sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? "")),
    matches: matches.sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? "")),
    teams: stored.teams,
  };
}
