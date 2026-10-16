import type { IgniteEvent, MapResult, Match, Team, TeamInfo } from "./model";
import { findTemplates, parseTemplateAt, stripMarkup, type Template } from "./wikitext";
import { teamShortName } from "./teams";

const API = "https://liquipedia.net/marvelrivals/api.php";
const WIKI = "https://liquipedia.net/marvelrivals/";
// Liquipedia's API terms require an identifying User-Agent and gzip, and ask for ≤1 query per 2s.
const HEADERS = {
  "User-Agent":
    "MRIgniteLive/0.1 (personal live score tracker; contact via github.com/kelechiodom)",
  "Accept-Encoding": "gzip",
};
const REQUEST_GAP_MS = 2100;
export const PAGE_PREFIX = "MR Ignite/2026";

let lastRequestAt = 0;

async function api<T>(params: Record<string, string>): Promise<T> {
  const wait = lastRequestAt + REQUEST_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
  const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Liquipedia ${res.status} for ${params.action}`);
  const body = (await res.json()) as T & { error?: { info: string } };
  if (body.error) throw new Error(`Liquipedia error: ${body.error.info}`);
  return body;
}

interface RevisionPage {
  title: string;
  missing?: boolean;
  revisions?: { revid: number; timestamp: string; slots?: { main: { content: string } } }[];
}

export async function listPages(): Promise<string[]> {
  const body = await api<{ query: { allpages: { title: string }[] } }>({
    action: "query",
    list: "allpages",
    apprefix: PAGE_PREFIX,
    aplimit: "200",
  });
  return body.query.allpages.map((p) => p.title);
}

export async function fetchRevisions(
  titles: string[],
): Promise<Map<string, { revid: number; timestamp: string }>> {
  const out = new Map<string, { revid: number; timestamp: string }>();
  for (let i = 0; i < titles.length; i += 50) {
    const body = await api<{ query: { pages: RevisionPage[] } }>({
      action: "query",
      prop: "revisions",
      rvprop: "ids|timestamp",
      titles: titles.slice(i, i + 50).join("|"),
    });
    for (const p of body.query.pages) {
      const rev = p.revisions?.[0];
      if (rev) out.set(p.title, { revid: rev.revid, timestamp: rev.timestamp });
    }
  }
  return out;
}

export async function fetchContents(titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 50) {
    const body = await api<{ query: { pages: RevisionPage[] } }>({
      action: "query",
      prop: "revisions",
      rvprop: "content",
      rvslots: "main",
      titles: titles.slice(i, i + 50).join("|"),
    });
    for (const p of body.query.pages) {
      const content = p.revisions?.[0]?.slots?.main.content;
      if (content !== undefined) out.set(p.title, content);
    }
  }
  return out;
}

// Times are written in the caster's local zone, e.g. "2026-10-16 - 06:00 {{Abbr/AEST}}".
const TZ_OFFSETS: Record<string, number> = {
  UTC: 0,
  GMT: 0,
  BST: 1,
  CET: 1,
  CEST: 2,
  EET: 2,
  EEST: 3,
  MSK: 3,
  GST: 4,
  IST: 5.5,
  ICT: 7,
  WIB: 7,
  SGT: 8,
  PHT: 8,
  CST: 8,
  HKT: 8,
  KST: 9,
  JST: 9,
  AEST: 10,
  AEDT: 11,
  NZST: 12,
  NZDT: 13,
  PST: -8,
  PDT: -7,
  MST: -7,
  MDT: -6,
  CDT: -5,
  EST: -5,
  EDT: -4,
  BRT: -3,
};

export function parseLiquipediaDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const m = /(\d{4})-(\d{2})-(\d{2})(?:\s*-\s*(\d{1,2}):(\d{2}))?/.exec(raw);
  if (!m) return null;
  const tz =
    /Abbr\/([A-Z]+)/.exec(raw)?.[1] ?? /\b([A-Z]{3,4})\b\s*$/.exec(raw.trim())?.[1] ?? "UTC";
  const offset = TZ_OFFSETS[tz] ?? 0;
  const [, y, mo, d, h = "0", mi = "0"] = m;
  const utc = Date.UTC(+y!, +mo! - 1, +d!, +h, +mi) - offset * 3_600_000;
  return new Date(utc).toISOString();
}

function parseTeam(raw: string | undefined): Team | null {
  if (!raw) return null;
  const tpl = raw.includes("{{") ? parseTemplateAt(raw, raw.indexOf("{{")) : null;
  const name = stripMarkup(tpl ? (tpl.params["1"] ?? tpl.params.template ?? "") : raw);
  if (!name || /^tbd$/i.test(name)) return null;
  return { name, short: teamShortName(name) };
}

function num(v: string | undefined): number | null {
  if (v === undefined || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseMaps(params: Record<string, string>): MapResult[] {
  const maps: MapResult[] = [];
  for (let i = 1; i <= 9; i++) {
    const raw = params[`map${i}`];
    if (!raw) continue;
    const t = parseTemplateAt(raw, raw.indexOf("{{"));
    if (!t) continue;
    const w = t.params.winner;
    maps.push({
      index: i,
      map: stripMarkup(t.params.map ?? ""),
      score1: num(t.params.score1),
      score2: num(t.params.score2),
      winner: w === "1" ? 1 : w === "2" ? 2 : 0,
      vod: t.params.vod || null,
    });
  }
  return maps;
}

function parseMatch(
  tpl: Template,
  base: Omit<
    Match,
    "bestOf" | "startsAt" | "team1" | "team2" | "maps" | "markedFinished" | "twitch" | "youtube"
  >,
): Match {
  const p = tpl.params;
  return {
    ...base,
    bestOf: num(p.bestof) ?? 3,
    startsAt: parseLiquipediaDate(p.date),
    team1: parseTeam(p.opponent1),
    team2: parseTeam(p.opponent2),
    maps: parseMaps(p),
    markedFinished: p.finished === "true" || Boolean(p.walkover),
    twitch: p.twitch || null,
    youtube: p.youtube || null,
  };
}

const TEAM_SEPARATOR = "\u00a7";

export async function fetchTeamInfo(names: string[]): Promise<Record<string, TeamInfo>> {
  const out: Record<string, TeamInfo> = {};
  for (let i = 0; i < names.length; i += 40) {
    const batch = names.slice(i, i + 40);
    const body = await api<{ expandtemplates: { wikitext: string } }>({
      action: "expandtemplates",
      prop: "wikitext",
      text: batch.map((n) => `{{TeamShort|${n}}}`).join(TEAM_SEPARATOR),
    });
    const chunks = body.expandtemplates.wikitext.split(TEAM_SEPARATOR);
    batch.forEach((name, j) => {
      const chunk = chunks[j] ?? "";
      out[name] = {
        short: /team-template-text[^>]*>\[\[[^|\]]*\|([^\]]+)\]\]/.exec(chunk)?.[1] ?? teamShortName(name),
        logoDark: /\[\[File:([^|\]]+darkmode[^|\]]*)/.exec(chunk)?.[1] ?? null,
        logoLight: /\[\[File:([^|\]]+lightmode[^|\]]*)/.exec(chunk)?.[1] ?? /\[\[File:([^|\]]+)/.exec(chunk)?.[1] ?? null,
      };
    });
  }
  const files = [...new Set(Object.values(out).flatMap((t) => [t.logoDark, t.logoLight]).filter((f): f is string => !!f))];
  const urls = new Map<string, string>();
  for (let i = 0; i < files.length; i += 50) {
    const body = await api<{ query: { pages: { title: string; imageinfo?: { thumburl?: string; url: string }[] }[]; normalized?: { from: string; to: string }[] } }>({
      action: "query",
      prop: "imageinfo",
      iiprop: "url",
      iiurlwidth: "96",
      titles: files.slice(i, i + 50).map((f) => `File:${f}`).join("|"),
    });
    for (const p of body.query.pages) {
      const info = p.imageinfo?.[0];
      if (info) urls.set(p.title.replace(/^File:/, ""), info.thumburl ?? info.url);
    }
  }
  const resolve = (f: string | null) => (f ? (urls.get(f) ?? urls.get(f.replace(/_/g, " ")) ?? null) : null);
  for (const info of Object.values(out)) {
    info.logoDark = resolve(info.logoDark);
    info.logoLight = resolve(info.logoLight);
  }
  return out;
}

export function eventIdFor(title: string): string {
  return title.replace(/\/Group Stage$/, "");
}

function phaseFor(title: string, kind: "bracket" | "matchlist"): string {
  if (title.endsWith("/Group Stage")) return "Group Stage";
  return kind === "bracket" ? "Playoffs" : "Matches";
}

function lastCommentBefore(text: string, pos: number, from: number): string | null {
  const slice = text.slice(from, pos);
  const all = [...slice.matchAll(/<!--\s*([\s\S]*?)\s*-->/g)];
  return all.length ? all[all.length - 1]![1]!.trim() : null;
}

export function parsePageMatches(title: string, text: string): Match[] {
  const eventId = eventIdFor(title);
  const matches: Match[] = [];
  const containers = [
    ...findTemplates(text, "Bracket").map((t) => ({ t, kind: "bracket" as const })),
    ...findTemplates(text, "Matchlist").map((t) => ({ t, kind: "matchlist" as const })),
  ];
  for (const { t, kind } of containers) {
    const containerId = stripMarkup(t.params.id ?? "").split(/\s+/)[0] || String(t.start);
    const containerText = text.slice(t.start, t.end);
    for (const [key, value] of Object.entries(t.params)) {
      if (!/^(R\d+M\d+|M\d+|RxM\w+)$/.test(key) || !value.includes("{{Match")) continue;
      const matchTpl = parseTemplateAt(value, value.indexOf("{{Match"));
      if (!matchTpl) continue;
      const keyPos = containerText.indexOf(`|${key}=`);
      const round =
        kind === "bracket"
          ? (lastCommentBefore(containerText, keyPos, 0) ?? key)
          : stripMarkup(t.params.title ?? "Matches");
      matches.push(
        parseMatch(matchTpl, {
          id: `${containerId}_${key}`,
          eventId,
          phase: phaseFor(title, kind),
          round,
        }),
      );
    }
  }
  return matches;
}

const REGIONS = ["Americas", "EMEA", "China", "Pacific", "Asia", "Oceania"];

export function parseEventInfo(title: string, text: string, updatedAt: string): IgniteEvent | null {
  if (title.endsWith("/Group Stage")) return null;
  const info = findTemplates(text, "Infobox league")[0]?.params ?? {};
  const parts = title.split("/");
  const region = [...parts].reverse().find((p) => REGIONS.includes(p)) ?? "Global";
  const stage = parts[2] ?? "Ignite";
  const name = stripMarkup(info.name ?? `Ignite 2026 ${parts.slice(2).join(" ")}`);
  return {
    id: title,
    name,
    ticker: stripMarkup(info.tickername ?? name),
    region: parts.includes("Pacific") && region !== "Pacific" ? `Pacific ${region}` : region,
    stage,
    startDate: info.sdate || null,
    endDate: info.edate || null,
    prizePoolUsd: num(info.prizepoolusd?.replace(/,/g, "")),
    liquipediaUrl: WIKI + title.replace(/ /g, "_"),
    updatedAt,
  };
}
