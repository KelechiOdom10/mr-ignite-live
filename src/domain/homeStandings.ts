import { matchState } from "./matchState";
import type { Group, IgniteEvent, Match } from "./model";
import { stagePhase } from "./stagePhase";
import { GROUP_STAGE, type GroupTable, groupTables } from "./standings";

export interface EventStandings {
  event: IgniteEvent;
  tables: GroupTable[];
}

/**
 * The events whose group stage is running and has begun, with their tables, under the shared phase.
 */
export function runningGroupStages(
  snapshot: {
    events: readonly IgniteEvent[];
    groups: readonly Group[];
    matches: readonly Match[];
  },
  now: number,
  include: (event: IgniteEvent) => boolean,
): EventStandings[] {
  return snapshot.events.flatMap((event) => {
    const groups = snapshot.groups.filter((g) => g.eventId === event.id);
    const matches = snapshot.matches.filter((m) => m.eventId === event.id);

    if (!include(event) || groups.length === 0) return [];

    const tables = groupTables(groups, matches, now);

    const running =
      stagePhase(matches, now, tables) === "groups" &&
      matches.some((m) => m.phase === GROUP_STAGE && matchState(m, now).status !== "upcoming");

    return running ? [{ event, tables }] : [];
  });
}
