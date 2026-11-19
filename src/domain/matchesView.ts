import { z } from "zod";

import type { Match } from "./model";

const RegionSchema = z.enum(["all", "americas", "emea", "china", "pacific"]);
const ListTabSchema = z.enum(["upcoming", "results"]);
const EventPhaseSchema = z.enum(["ongoing", "upcoming", "completed"]);
const ResultRangeSchema = z.enum(["any", "7d", "30d"]);
const FilterValueSchema = z.string().min(1).nullable();

/** The region filters, in display order. */
export const MATCH_REGIONS = RegionSchema.options;

export type ListTab = z.infer<typeof ListTabSchema>;

export type EventPhase = z.infer<typeof EventPhaseSchema>;

export type ResultRange = z.infer<typeof ResultRangeSchema>;

export const isRegionFilter = (value: string): value is MatchesView["region"] =>
  RegionSchema.safeParse(value).success;

export const isListTab = (value: string): value is ListTab =>
  ListTabSchema.safeParse(value).success;

export const isEventPhase = (value: string): value is EventPhase =>
  EventPhaseSchema.safeParse(value).success;

/**
 * The matches page's state, shared with the home summary. A null `tab` means the reader hasn't
 * picked one, so the page chooses.
 */
export type MatchesView = {
  region: z.infer<typeof RegionSchema>;
  tab: ListTab | null;
  events: EventPhase;
  event: string | null;
  team: string | null;
  range: ResultRange;
};

export const DEFAULT_MATCHES_VIEW: MatchesView = {
  region: "all",
  tab: null,
  events: "ongoing",
  event: null,
  team: null,
  range: "any",
};

/** Reads the tabs and results filters from the query, so browser back returns to what was shown. */
export function matchesViewFromQuery(query: {
  region?: string;
  tab?: string;
  events?: string;
  event?: string;
  team?: string;
  range?: string;
}): MatchesView {
  const view: MatchesView = {
    region: RegionSchema.catch(DEFAULT_MATCHES_VIEW.region).parse(query.region),
    tab: ListTabSchema.nullable()
      .catch(null)
      .parse(query.tab ?? null),
    events: EventPhaseSchema.catch(DEFAULT_MATCHES_VIEW.events).parse(query.events),
    event: FilterValueSchema.catch(null).parse(query.event),
    team: FilterValueSchema.catch(null).parse(query.team),
    range: ResultRangeSchema.catch(DEFAULT_MATCHES_VIEW.range).parse(query.range),
  };

  return view.tab === "upcoming" ? withListTab(view, "upcoming") : view;
}

/**
 * The view a tab shows. Event, team and range only filter Results, so Upcoming drops them rather
 * than leave a URL describing filters the page ignores.
 */
export function withListTab(view: MatchesView, tab: ListTab): MatchesView {
  return tab === "upcoming"
    ? { ...view, tab, event: null, team: null, range: DEFAULT_MATCHES_VIEW.range }
    : { ...view, tab };
}

/**
 * Upcoming series in listing order: dated ones soonest first, then the undated bracket series,
 * which have no time to sort by. `limit` counts dated series only, so a full schedule can't push
 * the bracket off the page.
 */
export function upcomingSeries(matches: readonly Match[], limit: number): Match[] {
  const dated: { at: number; match: Match }[] = [];
  const undated: Match[] = [];

  for (const match of matches) {
    if (match.startsAt === null) undated.push(match);
    else dated.push({ at: Date.parse(match.startsAt), match });
  }

  const soonest = dated.toSorted((a, b) => a.at - b.at);

  return [...soonest.slice(0, limit).map((entry) => entry.match), ...undated];
}

export function splitBracketSlots(matches: readonly Match[]): {
  known: Match[];
  awaiting: Match[];
} {
  const known: Match[] = [];
  const awaiting: Match[] = [];

  for (const match of matches) (match.team1 && match.team2 ? known : awaiting).push(match);

  return { known, awaiting };
}

/** The query string for a view, leaving out defaults so the plain URLs stay clean. */
export function matchesViewSearch(view: MatchesView): string {
  const entries = [
    ["tab", view.tab],
    ["region", view.region === DEFAULT_MATCHES_VIEW.region ? null : view.region],
    ["events", view.events === DEFAULT_MATCHES_VIEW.events ? null : view.events],
    ["event", view.event],
    ["team", view.team],
    ["range", view.range === DEFAULT_MATCHES_VIEW.range ? null : view.range],
  ].filter((entry): entry is [string, string] => entry[1] !== null);

  const search = new URLSearchParams(entries).toString();

  return search === "" ? "" : `?${search}`;
}

export function hasResultFilters(view: MatchesView): boolean {
  return view.event !== null || view.team !== null || view.range !== DEFAULT_MATCHES_VIEW.range;
}

/**
 * Which tab /matches opens on. Live series render above either list, so they keep it on upcoming;
 * results win once nothing more is coming, or the day's play is over. An undated series has no date
 * to rule it out for today and the page lists it under Upcoming, so it counts as still coming.
 */
export function smartDefaultTab(
  live: readonly Match[],
  upcoming: readonly Match[],
  results: readonly Match[],
  now: number,
): ListTab {
  if (live.length > 0 || results.length === 0) return "upcoming";

  if (upcoming.length === 0) return "results";

  const playedToday = results.some((m) => m.startsAt !== null && isToday(m.startsAt, now));
  const moreComing = upcoming.some((m) => m.startsAt === null || isToday(m.startsAt, now));

  return playedToday && !moreComing ? "results" : "upcoming";
}

function isToday(iso: string, now: number): boolean {
  return new Date(iso).toDateString() === new Date(now).toDateString();
}

export function matchesHref(view: { region: MatchesView["region"]; tab: ListTab | null }): string {
  return `/matches${matchesViewSearch({ ...DEFAULT_MATCHES_VIEW, ...view })}`;
}
