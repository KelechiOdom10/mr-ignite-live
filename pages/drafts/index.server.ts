import { defineHandler, defineHead, type InferProps } from "void";

import {
  IGNITE_2026,
  RANKED_SEASON_10_OBSERVED,
  draftCoverage,
  filterDrafts,
  summariseDrafts,
  toTeamDrafts,
} from "@/domain/draft";
import { type GameMode, mapInfo } from "@/domain/maps";
import { matchState } from "@/domain/matchState";
import { scopeSnapshot } from "@/domain/scope";

import { currentSnapshot, readAllStats } from "../../src/sync";

export type Props = InferProps<typeof loader>;

const MODES: readonly GameMode[] = ["Domination", "Convoy", "Convergence"];

function modeParam(value: string | undefined): GameMode | null {
  return MODES.find((m) => m === value) ?? null;
}

export const loader = defineHandler(async (c) => {
  const now = Date.now();
  const [full, allStats] = await Promise.all([currentSnapshot(), readAllStats()]);
  const matchById = new Map(full.matches.map((m) => [m.id, m]));
  const eventIds = new Set(allStats.flatMap((s) => matchById.get(s.matchId)?.eventId ?? []));
  const events = full.events
    .filter((e) => eventIds.has(e.id))
    .map((e) => ({ id: e.id, name: e.name }));

  const eventId = events.find((e) => e.id === c.req.query("event"))?.id ?? null;
  const inEvent = allStats.filter((s) => !eventId || matchById.get(s.matchId)?.eventId === eventId);
  const maps = [...new Set(inEvent.flatMap((s) => s.maps.map((m) => m.map)))].sort();
  const map = maps.find((m) => m === c.req.query("map")) ?? null;
  const mode = map ? (mapInfo(map)?.mode ?? null) : modeParam(c.req.query("mode"));

  const withStats = new Set(inEvent.map((s) => s.matchId));
  // Scoreboards are only cached for series that finished after caching began.
  const cachedSince = full.matches
    .filter((m) => withStats.has(m.id) && m.startsAt)
    .map((m) => m.startsAt ?? "")
    .sort()[0];
  const finished = full.matches.filter(
    (m) =>
      (!eventId || m.eventId === eventId) &&
      cachedSince !== undefined &&
      m.startsAt !== null &&
      m.startsAt >= cachedSince &&
      matchState(m, now).status === "finished",
  );

  return {
    snapshot: scopeSnapshot(full, { kind: "events" }, now),
    filter: { eventId, map, mode },
    options: { events, maps, modes: MODES },
    summary: summariseDrafts(filterDrafts(toTeamDrafts(inEvent), { map, mode })),
    coverage: {
      ...draftCoverage(inEvent, IGNITE_2026),
      finishedSeriesWithoutStats: finished.filter((m) => !withStats.has(m.id)).length,
    },
    formats: { pro: IGNITE_2026, ranked: RANKED_SEASON_10_OBSERVED },
  };
});

export const head = defineHead(() => ({ title: "Drafts" }));
