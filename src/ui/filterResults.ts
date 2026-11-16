import type { MatchesView, ResultRange } from "@/domain/matchesView";
import { matchState } from "@/domain/matchState";
import type { IgniteEvent, Match } from "@/domain/model";
import { teamSpellings } from "@/domain/teamIdentity";

import { regionKey } from "./region";

const DAY_MS = 24 * 60 * 60 * 1000;

const RANGE_MS: Record<Exclude<ResultRange, "any">, number> = {
  "7d": 7 * DAY_MS,
  "30d": 30 * DAY_MS,
};

function playsFor(match: Match, names: ReadonlySet<string>): boolean {
  return (
    (match.team1 !== null && names.has(match.team1.name)) ||
    (match.team2 !== null && names.has(match.team2.name))
  );
}

/** Newest first, matching the day groups the page draws. */
export function filterResults(
  matches: readonly Match[],
  events: ReadonlyMap<string, IgniteEvent>,
  view: MatchesView,
  now: number,
): Match[] {
  const since = view.range === "any" ? null : now - RANGE_MS[view.range];
  // A team's series are recorded under whichever spelling the source used, so the filter matches
  // all of them rather than the one name the option happens to show.
  const teams = view.team === null ? null : teamSpellings(matches, view.team);

  return matches
    .filter((match) => {
      if (view.region !== "all" && regionKey(events.get(match.eventId)?.region) !== view.region)
        return false;

      if (view.event !== null && match.eventId !== view.event) return false;

      if (teams !== null && !playsFor(match, teams)) return false;

      if (matchState(match, now).status !== "finished") return false;

      return since === null || (match.startsAt !== null && Date.parse(match.startsAt) >= since);
    })
    .toReversed();
}
