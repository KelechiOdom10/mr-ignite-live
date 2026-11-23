import {
  type Group,
  type IgniteEvent,
  type MapResult,
  type Match,
  type PrizePlacement,
  type Team,
} from "@/domain/model";
import { GROUP_STAGE } from "@/domain/standings";
import { teamShortName } from "@/domain/teams";

import { parseLiquipediaDate } from "./dates";
import { findTemplates, parseTemplateAt, stripMarkup, type Template } from "./wikitext";

const WIKI = "https://liquipedia.net/marvelrivals/";
const GROUP_STAGE_SUFFIX = "/Group Stage";
const REGIONS = ["Americas", "EMEA", "China", "Pacific", "Asia", "Oceania"];
const MATCH_KEY = /^(R\d+M\d+|M\d+|RxM\w+)$/;
const PRIZE_POOL_TEMPLATES = ["TeamPrizePool", "PrizePool"];

type ContainerKind = "bracket" | "matchlist";

export function eventIdFor(title: string): string {
  return title.endsWith(GROUP_STAGE_SUFFIX) ? title.slice(0, -GROUP_STAGE_SUFFIX.length) : title;
}

function parseNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const n = Number(value);

  return Number.isFinite(n) ? n : null;
}

function templateIn(raw: string, name: string): Template | null {
  const start = raw.indexOf(`{{${name}`);

  return start < 0 ? null : parseTemplateAt(raw, start);
}

function parseTeam(raw: string | undefined): Team | null {
  if (!raw) return null;
  const tpl = templateIn(raw, "");
  const name = stripMarkup(tpl ? (tpl.params["1"] ?? tpl.params.template ?? "") : raw);

  if (!name || /^tbd$/i.test(name)) return null;

  return { name, short: teamShortName(name) };
}

function parseMaps(params: Record<string, string>): MapResult[] {
  const maps: MapResult[] = [];

  for (let index = 1; index <= 9; index++) {
    const raw = params[`map${index}`];
    const tpl = raw ? templateIn(raw, "Map") : null;

    if (!tpl) continue;
    const winner = tpl.params.winner;
    maps.push({
      index,
      map: stripMarkup(tpl.params.map ?? ""),
      score1: parseNumber(tpl.params.score1),
      score2: parseNumber(tpl.params.score2),
      winner: winner === "1" ? 1 : winner === "2" ? 2 : 0,
      vod: tpl.params.vod || null,
    });
  }

  return maps;
}

function parseOpponent(raw: string): Team | null {
  const tpl = templateIn(raw, "");
  const name = stripMarkup(tpl ? (tpl.params["1"] ?? tpl.params.team ?? "") : raw);

  if (!name || /^tbd$/i.test(name)) return null;

  return { name, short: teamShortName(name) };
}

function slotOpponents(slot: Template): (Team | null)[] {
  const opponents: (Team | null)[] = [];

  for (let index = 1; slot.params[String(index)] !== undefined; index++) {
    opponents.push(parseOpponent(slot.params[String(index)] ?? ""));
  }

  return opponents;
}

// Liquipedia lists qualification-only slots with no USD prize; they still occupy places, so the
// place count advances for every slot, not just the paid ones.
export function parsePrizePool(text: string): PrizePlacement[] {
  const header = PRIZE_POOL_TEMPLATES.map((name) => findTemplates(text, name)[0]).find(
    (tpl): tpl is Template => tpl !== undefined,
  );

  if (!header) return [];

  const placements: PrizePlacement[] = [];
  let nextPlace = 1;

  for (let index = 1; header.params[String(index)] !== undefined; index++) {
    const slot = templateIn(header.params[String(index)] ?? "", "Slot");

    if (!slot) continue;
    const opponents = slotOpponents(slot);
    const count = parseNumber(slot.params.count) ?? Math.max(opponents.length, 1);
    const first = parseNumber(slot.params.place) ?? nextPlace;
    const prizeUsd = parseNumber(slot.params.usdprize?.replace(/,/g, ""));

    if (prizeUsd !== null) {
      for (let offset = 0; offset < count; offset++) {
        placements.push({
          place: first + offset,
          prizeUsd,
          count,
          team: opponents[offset] ?? null,
        });
      }
    }

    nextPlace = first + count;
  }

  return placements;
}

function phaseFor(title: string, kind: ContainerKind): string {
  if (title.endsWith(GROUP_STAGE_SUFFIX)) return GROUP_STAGE;

  return kind === "bracket" ? "Playoffs" : "Matches";
}

function firstToken(value: string): string {
  return value.split(/\s+/)[0] ?? "";
}

function lastCommentBefore(text: string, end: number): string | null {
  const comments = [...text.slice(0, end).matchAll(/<!--\s*([\s\S]*?)\s*-->/g)];

  return comments.at(-1)?.[1]?.trim() ?? null;
}

export function parsePageMatches(title: string, text: string): Match[] {
  const eventId = eventIdFor(title);

  const containers: { tpl: Template; kind: ContainerKind }[] = [
    ...findTemplates(text, "Bracket").map((tpl) => ({ tpl, kind: "bracket" as const })),
    ...findTemplates(text, "Matchlist").map((tpl) => ({ tpl, kind: "matchlist" as const })),
  ];

  const matches: Match[] = [];

  for (const { tpl, kind } of containers) {
    const containerId = firstToken(stripMarkup(tpl.params.id ?? "")) || String(tpl.start);
    const containerText = text.slice(tpl.start, tpl.end);

    for (const [key, value] of Object.entries(tpl.params)) {
      if (!MATCH_KEY.test(key)) continue;
      const matchTpl = templateIn(value, "Match");

      if (!matchTpl) continue;
      const p = matchTpl.params;

      const round =
        kind === "bracket"
          ? (lastCommentBefore(containerText, containerText.indexOf(`|${key}=`)) ?? key)
          : stripMarkup(tpl.params.title ?? "Matches");

      matches.push({
        id: `${containerId}_${key}`,
        eventId,
        phase: phaseFor(title, kind),
        round,
        bestOf: parseNumber(p.bestof) ?? 3,
        startsAt: parseLiquipediaDate(p.date),
        team1: parseTeam(p.opponent1),
        team2: parseTeam(p.opponent2),
        maps: parseMaps(p),
        markedFinished: p.finished === "true" || Boolean(p.walkover),
        twitch: p.twitch || null,
        youtube: p.youtube || null,
      });
    }
  }

  return matches;
}

export function parseGroups(title: string, text: string): Group[] {
  return findTemplates(text, "GroupStandings").flatMap((tpl) => {
    const groupTitle = stripMarkup(tpl.params.title ?? "");

    const matchGroups = (tpl.params.matchgroups ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const [, from, to] = /(\d+)(?:-(\d+))?\s*=\s*up/.exec(tpl.params.bg ?? "") ?? [];
    const advance = Number(to ?? from);

    if (!groupTitle || matchGroups.length === 0 || !(advance > 0)) return [];

    return [{ eventId: eventIdFor(title), title: groupTitle, matchGroups, advance }];
  });
}

export function parseEventInfo(title: string, text: string, updatedAt: string): IgniteEvent | null {
  if (title.endsWith(GROUP_STAGE_SUFFIX)) return null;
  const league = findTemplates(text, "Infobox league")[0];

  if (!league) return null;
  const info = league.params;
  const parts = title.split("/");
  const region = parts.findLast((p) => REGIONS.includes(p)) ?? "Global";
  const name = stripMarkup(info.name ?? `Ignite 2026 ${parts.slice(2).join(" ")}`);

  return {
    id: title,
    name,
    ticker: stripMarkup(info.tickername ?? name),
    region: parts.includes("Pacific") && region !== "Pacific" ? `Pacific ${region}` : region,
    stage: parts[2] ?? "Ignite",
    startDate: info.sdate || null,
    endDate: info.edate || null,
    prizePoolUsd: parseNumber(info.prizepoolusd?.replace(/,/g, "")),
    prizes: parsePrizePool(text),
    liquipediaUrl: WIKI + title.replace(/ /g, "_"),
    updatedAt,
    iconFile: stripMarkup(info.icon ?? info.image ?? "") || null,
    iconUrl: null,
  };
}

export const TEAM_TEMPLATE_SEPARATOR = "§";

export interface TeamTemplate {
  short: string | null;
  logoDarkFile: string | null;
  logoLightFile: string | null;
}

export function parseTeamShortExpansion(chunk: string): TeamTemplate {
  return {
    short: /team-template-text[^>]*>\[\[[^|\]]*\|([^\]]+)\]\]/.exec(chunk)?.[1] ?? null,
    logoDarkFile: /\[\[File:([^|\]]+darkmode[^|\]]*)/.exec(chunk)?.[1] ?? null,
    logoLightFile:
      /\[\[File:([^|\]]+lightmode[^|\]]*)/.exec(chunk)?.[1] ??
      /\[\[File:([^|\]]+)/.exec(chunk)?.[1] ??
      null,
  };
}
