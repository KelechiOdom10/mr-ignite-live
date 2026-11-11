import type { MatchesView, ResultRange } from "@/domain/matchesView";
import { matchState } from "@/domain/matchState";
import type { IgniteEvent, Match } from "@/domain/model";

import { regionKey } from "./region";

const DAY_MS = 24 * 60 * 60 * 1000;

const RANGE_MS: Record<Exclude<ResultRange, "any">, number> = {
  "7d": 7 * DAY_MS,
  "30d": 30 * DAY_MS,
};

/** Newest first, matching the day groups the page draws. */
export function filterResults(
  matches: readonly Match[],
  events: ReadonlyMap<string, IgniteEvent>,
  view: MatchesView,
  now: number,
): Match[] {
  const since = view.range === "any" ? null : now - RANGE_MS[view.range];

  return matches
    .filter((match) => {
      if (view.region !== "all" && regionKey(events.get(match.eventId)?.region) !== view.region)
        return false;

      if (view.event !== null && match.eventId !== view.event) return false;

      const team = view.team;

      if (team !== null && match.team1?.name !== team && match.team2?.name !== team) return false;

      if (matchState(match, now).status !== "finished") return false;

      return since === null || (match.startsAt !== null && Date.parse(match.startsAt) >= since);
    })
    .toReversed();
}
