import { type GameMode, mapInfo } from "./maps";
import { matchState } from "./matchState";
import type { IgniteEvent, Match } from "./model";
import type { MatchStats } from "./stats";

export const GAME_MODES: readonly GameMode[] = ["Domination", "Convoy", "Convergence"];

export interface DraftQuery {
  event?: string | undefined;
  map?: string | undefined;
  mode?: string | undefined;
}

export interface DraftScope {
  filter: { eventId: string | null; map: string | null; mode: GameMode | null };
  options: { events: { id: string; name: string }[]; maps: string[]; modes: readonly GameMode[] };
  stats: MatchStats[];
  finishedSeriesWithoutStats: number;
}

/** Unknown query values fall back to "all"; a map decides the mode, so the two can't conflict. */
export function draftScope({
  stats,
  matches,
  events,
  query,
  now,
}: {
  stats: readonly MatchStats[];
  matches: readonly Match[];
  events: readonly IgniteEvent[];
  query: DraftQuery;
  now: number;
}): DraftScope {
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const eventIds = new Set(stats.flatMap((s) => matchById.get(s.matchId)?.eventId ?? []));

  const eventOptions = events
    .filter((e) => eventIds.has(e.id))
    .map((e) => ({ id: e.id, name: e.name }));

  const eventId = eventOptions.find((e) => e.id === query.event)?.id ?? null;
  const inScope = stats.filter((s) => !eventId || matchById.get(s.matchId)?.eventId === eventId);
  const maps = [...new Set(inScope.flatMap((s) => s.maps.map((m) => m.map)))].sort();
  const map = maps.find((m) => m === query.map) ?? null;

  const mode = map
    ? (mapInfo(map)?.mode ?? null)
    : (GAME_MODES.find((m) => m === query.mode) ?? null);

  // Scoreboards are only cached for series that finished after caching began.
  const withStats = new Set(inScope.map((s) => s.matchId));

  const cachedSince = matches
    .flatMap((m) => (withStats.has(m.id) && m.startsAt ? [m.startsAt] : []))
    .sort()[0];

  const missing = matches.filter(
    (m) =>
      cachedSince !== undefined &&
      !withStats.has(m.id) &&
      (!eventId || m.eventId === eventId) &&
      m.startsAt !== null &&
      m.startsAt >= cachedSince &&
      matchState(m, now).status === "finished",
  );

  return {
    filter: { eventId, map, mode },
    options: { events: eventOptions, maps, modes: GAME_MODES },
    stats: inScope,
    finishedSeriesWithoutStats: missing.length,
  };
}
