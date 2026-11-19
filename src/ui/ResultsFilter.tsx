import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/motion/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select";
import type { EventOption, TeamOption } from "@/domain/matchesOptions";
import { hasResultFilters, type MatchesView, type ResultRange } from "@/domain/matchesView";
import { teamShortName } from "@/domain/teams";

import { EventSelect } from "./EventSelect";
import { TeamLogo } from "./TeamMark";

const ANY = "__any";

export const RANGE_FILTERS: readonly { value: ResultRange; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

export interface ResultFilterChange {
  event?: string | null;
  team?: string | null;
  range?: ResultRange;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function TeamRow({ team }: { team: TeamOption }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <TeamLogo
        team={{ name: team.name, short: teamShortName(team.name) }}
        logo={team.logo}
        size={18}
      />
      <span className="min-w-0 truncate">{team.name}</span>
    </span>
  );
}

export function ResultsFilter({
  view,
  events,
  teams,
  onChange,
  onClear,
}: {
  view: MatchesView;
  events: readonly EventOption[];
  teams: readonly TeamOption[];
  onChange: (change: ResultFilterChange) => void;
  onClear: () => void;
}) {
  const rangeLabel = RANGE_FILTERS.find((r) => r.value === view.range)?.label;
  const chosenTeam = teams.find((team) => team.spellings.includes(view.team ?? ""));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <Field label="Event">
        <EventSelect
          className="w-full min-w-0 sm:w-60"
          value={view.event}
          events={events}
          onChange={(event) => onChange({ event })}
        />
      </Field>

      <Field label="Team">
        <Select
          className="w-full min-w-0 sm:w-48"
          value={view.team ?? ANY}
          onValueChange={(value) => onChange({ team: value === ANY ? null : value })}
        >
          <SelectTrigger>
            <span className="sr-only">Team</span>
            {chosenTeam ? (
              <TeamRow team={chosenTeam} />
            ) : (
              <span className="min-w-0 truncate text-muted-foreground">
                {view.team ?? "All teams"}
              </span>
            )}
          </SelectTrigger>
          <SelectContent className="max-h-80 overflow-y-auto">
            <SelectItem value={ANY}>All teams</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.name} value={team.name}>
                <TeamRow team={team} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Date">
        <Select
          className="w-full min-w-0 sm:w-40"
          value={view.range}
          onValueChange={(value) => {
            const next = RANGE_FILTERS.find((r) => r.value === value);

            if (next) onChange({ range: next.value });
          }}
        >
          <SelectTrigger>
            <span className="sr-only">Date</span>
            <SelectValue placeholder={rangeLabel} className="truncate" />
          </SelectTrigger>
          <SelectContent>
            {RANGE_FILTERS.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {hasResultFilters(view) && (
        <Button variant="ghost" size="sm" className="self-start sm:self-end" onClick={onClear}>
          <X className="size-3.5" aria-hidden />
          Clear
        </Button>
      )}
    </div>
  );
}
