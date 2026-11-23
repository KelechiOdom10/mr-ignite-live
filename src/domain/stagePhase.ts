import { PLAYOFFS } from "./bracket";
import { matchState } from "./matchState";
import type { Match } from "./model";

export type StagePhase = "groups" | "between" | "playoffs";

/**
 * Where an event is: still in its group stage, waiting between the stages, or in the playoffs.
 * Seeding a playoff slot early doesn't count; only a playoff series that has started does.
 */
export function stagePhase(matches: readonly Match[], now: number): StagePhase {
  const started = (m: Match) => matchState(m, now).status !== "upcoming";

  if (matches.some((m) => m.phase === PLAYOFFS && started(m))) return "playoffs";

  const groupsLeft = matches.some(
    (m) => m.phase !== PLAYOFFS && matchState(m, now).status !== "finished",
  );

  return groupsLeft ? "groups" : "between";
}

export interface GroupDays {
  /** Rounds such as "Day 1", in the order they are played. */
  days: string[];
  /** The day the stage is on: the first with an unfinished series, else the last. */
  current: string | null;
}

export function groupDays(matches: readonly Match[], now: number): GroupDays {
  const ordered = matches.toSorted((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
  const days = [...new Set(ordered.map((m) => m.round))];
  const open = ordered.find((m) => matchState(m, now).status !== "finished");

  return { days, current: open?.round ?? days.at(-1) ?? null };
}
