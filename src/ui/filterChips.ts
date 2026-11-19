import type { EventOption, TeamOption } from "@/domain/matchesOptions";
import type { MatchesView } from "@/domain/matchesView";

import { RANGE_FILTERS, type ResultFilterChange } from "./ResultsFilter";

export interface FilterChip {
  key: "event" | "team" | "range";
  label: string;
  clear: ResultFilterChange;
}

export function filterChips(
  view: MatchesView,
  events: readonly EventOption[],
  teams: readonly TeamOption[],
): FilterChip[] {
  const chips: FilterChip[] = [];

  if (view.event !== null) {
    const name = events.find((event) => event.id === view.event)?.name ?? view.event;

    chips.push({ key: "event", label: `Event: ${name}`, clear: { event: null } });
  }

  if (view.team !== null) {
    const name = teams.find((team) => team.spellings.includes(view.team ?? ""))?.name ?? view.team;

    chips.push({ key: "team", label: `Team: ${name}`, clear: { team: null } });
  }

  if (view.range !== "any") {
    const label = RANGE_FILTERS.find((range) => range.value === view.range)?.label ?? view.range;

    chips.push({ key: "range", label: `Date: ${label}`, clear: { range: "any" } });
  }

  return chips;
}
