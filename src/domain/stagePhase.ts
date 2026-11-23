import { PLAYOFFS } from "./bracket";
import { matchState } from "./matchState";
import type { Match } from "./model";
import { type GroupTable, hasResult } from "./standings";

export type StagePhase = "groups" | "between" | "playoffs";

export type StageTab = "groups" | "playoffs";

function playoffsStarted(match: Match, now: number): boolean {
  const state = matchState(match, now);

  return (
    match.phase === PLAYOFFS &&
    (state.playedMaps.length > 0 ||
      hasResult(match) ||
      (state.status === "live" && !!match.team1 && !!match.team2))
  );
}

/**
 * Where an event is: still in its group stage, waiting between the stages, or in the playoffs.
 * The groups are over only when every group series has a real result and every table the page
 * gives is whole, never because a card timed out or a fixture is missing. The playoffs have
 * started only when a series has maps, a result or two teams on a live card; a seeded slot or
 * a walkover with no winner doesn't count.
 */
export function stagePhase(
  matches: readonly Match[],
  now: number,
  tables: readonly GroupTable[] = [],
): StagePhase {
  if (matches.some((m) => playoffsStarted(m, now))) return "playoffs";

  const groupsLeft =
    matches.some((m) => m.phase !== PLAYOFFS && !hasResult(m)) || tables.some((t) => !t.complete);

  return groupsLeft ? "groups" : "between";
}

export function defaultStageTab(phase: StagePhase, seeded: boolean): StageTab {
  return phase === "playoffs" || (phase === "between" && seeded) ? "playoffs" : "groups";
}

/** The reader's pick while it still exists; otherwise the tab the phase calls for. */
export function visibleTab<T extends string>(
  picked: T | null,
  available: readonly T[],
  fallback: T,
): T {
  return picked !== null && available.includes(picked) ? picked : fallback;
}

/** Earliest first; a series with no kickoff yet sorts last. */
export function byKickoff(a: Match, b: Match): number {
  if (!a.startsAt || !b.startsAt) return Number(!a.startsAt) - Number(!b.startsAt);

  return a.startsAt.localeCompare(b.startsAt);
}

export interface GroupDays {
  /** Rounds such as "Day 1", in the order they are played. */
  days: string[];
  /** The day the stage is on: one with a kickoff on the reader's date, else the first with an unfinished series, else the last. */
  current: string | null;
  /** Every round with a kickoff on the reader's date; empty until a date key is given. */
  today: string[];
}

/** `dateOf` turns a kickoff into the reader's calendar date; leave it out before the reader's zone is known. */
export function groupDays(
  matches: readonly Match[],
  now: number,
  dateOf?: (iso: string) => string,
): GroupDays {
  const ordered = matches.toSorted(byKickoff);
  const days = [...new Set(ordered.map((m) => m.round))];
  const open = ordered.find((m) => matchState(m, now).status !== "finished");
  const date = dateOf?.(new Date(now).toISOString());

  const today = dateOf
    ? days.filter((day) =>
        ordered.some((m) => m.round === day && m.startsAt && dateOf(m.startsAt) === date),
      )
    : [];

  const unfinishedToday = today.find((day) =>
    ordered.some((m) => m.round === day && matchState(m, now).status !== "finished"),
  );

  return {
    days,
    current: unfinishedToday ?? today[0] ?? open?.round ?? days.at(-1) ?? null,
    today,
  };
}
