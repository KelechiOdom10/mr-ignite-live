import { Link } from "@void/react";

import { Tooltip } from "@/components/motion/tooltip";
import { matchState } from "@/domain/matchState";
import type { Match, Snapshot, Team } from "@/domain/model";
import { cn } from "@/lib/utils";

import { useSpoilersHidden } from "./spoilers";
import { TeamLogo } from "./TeamMark";
import { formatDay } from "./time";

const FORM_LENGTH = 10;

interface FormResult {
  match: Match;
  won: boolean;
  opponent: Team | null;
  score: string;
}

function involves(match: Match, team: Team): boolean {
  return match.team1?.name === team.name || match.team2?.name === team.name;
}

export function recentForm(team: Team, matches: Match[], now: number): FormResult[] {
  return matches
    .filter((m) => involves(m, team) && m.startsAt)
    .map((m) => ({ m, s: matchState(m, now) }))
    .filter(({ s }) => s.status === "finished" && s.winner !== 0)
    .toSorted((a, b) => (a.m.startsAt ?? "").localeCompare(b.m.startsAt ?? ""))
    .slice(-FORM_LENGTH)
    .map(({ m, s }) => {
      const side = m.team1?.name === team.name ? 1 : 2;
      const won = s.winner === side;
      const own = side === 1 ? s.wins1 : s.wins2;
      const theirs = side === 1 ? s.wins2 : s.wins1;
      return { match: m, won, opponent: side === 1 ? m.team2 : m.team1, score: `${own}–${theirs}` };
    });
}

function streak(results: FormResult[]): string | null {
  const last = results.at(-1);
  if (!last) return null;
  let n = 0;
  for (let i = results.length - 1; i >= 0 && results[i]?.won === last.won; i--) n++;
  return n >= 2 ? `${n}-${last.won ? "win" : "loss"} streak` : null;
}

export function TeamForm({ team, snapshot, now }: { team: Team; snapshot: Snapshot; now: number }) {
  const hidden = useSpoilersHidden();
  const results = recentForm(team, snapshot.matches, now);
  if (hidden || results.length === 0) return null;
  const wins = results.filter((r) => r.won).length;
  const run = streak(results);
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <TeamLogo team={team} info={snapshot.teams[team.name]} size={28} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{team.name}</div>
          <div className="text-xs text-muted-foreground">
            Last {results.length}:{" "}
            <span className="font-mono tabular-nums">
              {wins}–{results.length - wins}
            </span>
            {run && <span> · {run}</span>}
          </div>
        </div>
      </div>
      <ol
        className="flex flex-wrap gap-1.5"
        aria-label={`${team.name} recent results, oldest first`}
      >
        {results.map((r) => (
          <li key={r.match.id}>
            <Tooltip
              content={
                <span className="block text-xs">
                  <span className="font-semibold">
                    {r.won ? "Won" : "Lost"} {r.score}
                  </span>{" "}
                  vs {r.opponent?.name ?? "TBD"}
                  <span className="block text-muted-foreground">
                    {r.match.startsAt ? formatDay(r.match.startsAt, now) : ""} · {r.match.round}
                  </span>
                </span>
              }
            >
              <Link
                href={`/match/${r.match.id}`}
                aria-label={`${r.won ? "Won" : "Lost"} ${r.score} against ${r.opponent?.name ?? "TBD"}`}
                className={cn(
                  "relative flex size-10 flex-col items-center justify-center gap-0.5 rounded-lg ring-1 ring-inset transition-transform hover:-translate-y-0.5",
                  r.won ? "bg-win/10 ring-win/30" : "bg-live/10 ring-live/30",
                )}
              >
                <TeamLogo
                  team={r.opponent}
                  info={r.opponent ? snapshot.teams[r.opponent.name] : undefined}
                  size={18}
                />
                <span
                  aria-hidden
                  className={cn(
                    "font-mono text-[0.6rem] leading-none font-bold",
                    r.won ? "text-win" : "text-live",
                  )}
                >
                  {r.won ? "W" : "L"}
                </span>
              </Link>
            </Tooltip>
          </li>
        ))}
      </ol>
    </div>
  );
}
