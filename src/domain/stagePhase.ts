import { PLAYOFFS } from "./bracket";
import { matchState } from "./matchState";
import type { Match } from "./model";
import { hasResult } from "./standings";

export type StagePhase = "groups" | "between" | "playoffs";

export type StageTab = "groups" | "playoffs";

/**
 * Where an event is: still in its group stage, waiting between the stages, or in the playoffs.
 * A group series counts as done only on a real result, never because the card timed out, and
 * seeding a playoff slot early doesn't count; only a playoff series that has started does.
 */
export function stagePhase(matches: readonly Match[], now: number): StagePhase {
  const started = (m: Match) => matchState(m, now).status !== "upcoming";

  if (matches.some((m) => m.phase === PLAYOFFS && started(m))) return "playoffs";

  const groupsLeft = matches.some((m) => m.phase !== PLAYOFFS && !hasResult(m, now));

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
  const ordered = matches.toSorted((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
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
