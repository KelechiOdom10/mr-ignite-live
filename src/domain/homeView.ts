import { z } from "zod";

const RegionSchema = z.enum(["all", "americas", "emea", "china", "pacific"]);
const ListTabSchema = z.enum(["upcoming", "results"]);
const EventPhaseSchema = z.enum(["ongoing", "upcoming", "completed"]);

/** The region filters, in display order. The home page labels these. */
export const HOME_REGIONS = RegionSchema.options;

export type ListTab = z.infer<typeof ListTabSchema>;

export type EventPhase = z.infer<typeof EventPhaseSchema>;

/** The home page's tabs. A null `tab` means the reader hasn't picked one, so the page chooses. */
export type HomeView = {
  region: z.infer<typeof RegionSchema>;
  tab: ListTab | null;
  events: EventPhase;
};

export const DEFAULT_HOME_VIEW: HomeView = { region: "all", tab: null, events: "ongoing" };

/** Reads the home tabs from the query, so browser back returns to the tab the reader left. */
export function homeViewFromQuery(query: {
  region?: string;
  tab?: string;
  events?: string;
}): HomeView {
  return {
    region: RegionSchema.catch(DEFAULT_HOME_VIEW.region).parse(query.region),
    tab: ListTabSchema.nullable()
      .catch(null)
      .parse(query.tab ?? null),
    events: EventPhaseSchema.catch(DEFAULT_HOME_VIEW.events).parse(query.events),
  };
}

/** The query string for a view, leaving out defaults so the plain home URL stays clean. */
export function homeViewSearch(view: HomeView): string {
  const entries = [
    ["tab", view.tab],
    ["region", view.region === DEFAULT_HOME_VIEW.region ? null : view.region],
    ["events", view.events === DEFAULT_HOME_VIEW.events ? null : view.events],
  ].filter((entry): entry is [string, string] => entry[1] !== null);

  const search = new URLSearchParams(entries).toString();

  return search === "" ? "" : `?${search}`;
}
