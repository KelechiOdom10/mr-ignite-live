import { z } from "zod";

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
  return {
    region: RegionSchema.catch(DEFAULT_MATCHES_VIEW.region).parse(query.region),
    tab: ListTabSchema.nullable()
      .catch(null)
      .parse(query.tab ?? null),
    events: EventPhaseSchema.catch(DEFAULT_MATCHES_VIEW.events).parse(query.events),
    event: FilterValueSchema.catch(null).parse(query.event),
    team: FilterValueSchema.catch(null).parse(query.team),
    range: ResultRangeSchema.catch(DEFAULT_MATCHES_VIEW.range).parse(query.range),
  };
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

export function matchesHref(view: { region: MatchesView["region"]; tab: ListTab | null }): string {
  return `/matches${matchesViewSearch({ ...DEFAULT_MATCHES_VIEW, ...view })}`;
}
