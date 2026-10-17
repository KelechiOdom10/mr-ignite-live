import { useMemo, useState } from "react";

import type { DraftFormat } from "@/domain/draft";
import {
  applyMove,
  type Camp,
  currentTurn,
  type MoveProblem,
  moveProblem,
  outcome,
  type SimMove,
} from "@/domain/draftSim";
import type { Hero } from "@/domain/stats";
import { cn } from "@/lib/utils";

import { HeroPortrait } from "../StatsPanel";

const TEAM: Record<Camp, string> = { 0: "First team", 1: "Second team" };
const ROLES = ["All", "Vanguard", "Duelist", "Strategist"] as const;

const PROBLEM: Record<MoveProblem["kind"], string> = {
  finished: "The draft is over. Undo a move or start again.",
  "not-your-turn": "It's the other team's move.",
  repeat: "That team has already done that with this hero.",
  "protected-by-opponent": "The other team protected this hero, so it can't be banned.",
};

function HeroList({ ids, byId }: { ids: string[]; byId: Map<string, Hero> }) {
  if (ids.length === 0) return <p className="text-sm text-muted-foreground">None yet</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {ids.map((id) => {
        const hero = byId.get(id);
        return (
          <li key={id} className="inline-flex items-center gap-1.5 text-sm">
            {hero && (
              <span aria-hidden="true">
                <HeroPortrait hero={hero} size={24} />
              </span>
            )}
            {hero?.name ?? id}
          </li>
        );
      })}
    </ul>
  );
}

export function DraftSimulator({ format, heroes }: { format: DraftFormat; heroes: Hero[] }) {
  const [moves, setMoves] = useState<SimMove[]>([]);
  const [camp, setCamp] = useState<Camp>(0);
  const [role, setRole] = useState<(typeof ROLES)[number]>("All");
  const [query, setQuery] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const byId = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);
  const turn = currentTurn(format, moves);
  const acting: Camp | null = turn
    ? turn.waiting.includes(camp)
      ? camp
      : (turn.waiting[0] ?? null)
    : null;
  const sides = outcome(moves);
  const shown = heroes.filter(
    (h) =>
      (role === "All" || h.role === role) &&
      h.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function choose(heroId: string) {
    if (acting === null) {
      setProblem(PROBLEM.finished);
      return;
    }
    const why = moveProblem(format, moves, acting, heroId);
    setProblem(why ? PROBLEM[why.kind] : null);
    if (!why) setMoves(applyMove(format, moves, acting, heroId));
  }

  return (
    <div className="grid gap-6">
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4"
        aria-live="polite"
      >
        <p className="font-medium">
          {turn && acting !== null
            ? `Step ${turn.step + 1} of ${format.steps.length}: ${TEAM[acting]} ${turn.kind === "ban" ? "bans" : "protects"}`
            : "Draft complete"}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMoves(moves.slice(0, -1));
              setProblem(null);
            }}
            disabled={moves.length === 0}
            className="h-9 rounded-md border px-3 text-sm disabled:opacity-50"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => {
              setMoves([]);
              setProblem(null);
            }}
            disabled={moves.length === 0}
            className="h-9 rounded-md border px-3 text-sm disabled:opacity-50"
          >
            Start again
          </button>
        </div>
        {turn && turn.waiting.length > 1 && (
          <fieldset className="flex w-full flex-wrap items-center gap-2 text-sm">
            <legend className="sr-only">Team moving now</legend>
            <span className="text-muted-foreground">Both teams ban in this step. Moving now:</span>
            {turn.waiting.map((c) => (
              <label key={c} className="inline-flex items-center gap-1.5">
                <input
                  type="radio"
                  name="acting-team"
                  checked={acting === c}
                  onChange={() => setCamp(c)}
                />
                {TEAM[c]}
              </label>
            ))}
          </fieldset>
        )}
        {problem && <p className="w-full text-sm text-destructive">{problem}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {([0, 1] as const).map((c) => (
          <section
            key={c}
            aria-labelledby={`team-${c}`}
            className={cn("rounded-lg border p-4", acting === c && "border-primary")}
          >
            <h2 id={`team-${c}`} className="font-medium">
              {TEAM[c]}
            </h2>
            <h3 className="mt-3 text-xs text-muted-foreground">Bans (the other team can't play)</h3>
            <HeroList ids={sides[c].bans} byId={byId} />
            <h3 className="mt-3 text-xs text-muted-foreground">Protects</h3>
            <HeroList ids={sides[c].protects} byId={byId} />
            <h3 className="mt-3 text-xs text-muted-foreground">Can't play</h3>
            <HeroList ids={sides[c].unavailable} byId={byId} />
          </section>
        ))}
      </div>

      <section aria-labelledby="hero-pool" className="grid gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <h2 id="hero-pool" className="mr-auto font-medium">
            Heroes
          </h2>
          <div className="flex gap-1" role="group" aria-label="Role">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={role === r}
                onClick={() => setRole(r)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-sm text-muted-foreground hover:bg-accent",
                  role === r && "bg-secondary text-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Find a hero
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-base sm:text-sm"
            />
          </label>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {shown.map((h) => {
            const outFor = ([0, 1] as const).filter((c) => sides[c].unavailable.includes(h.id));
            const isProtected =
              sides[0].protects.includes(h.id) || sides[1].protects.includes(h.id);
            const outLabel =
              outFor.length === 2
                ? "Out for both"
                : outFor[0] === 0
                  ? "Out for 1st"
                  : "Out for 2nd";
            return (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => choose(h.id)}
                  className="flex w-full items-center gap-2 rounded-md border p-2 text-left text-sm hover:bg-accent"
                >
                  <span aria-hidden="true">
                    <HeroPortrait hero={h} size={28} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{h.name}</span>
                  <span className="grid justify-items-end text-xs text-muted-foreground">
                    {outFor.length > 0 && <span>{outLabel}</span>}
                    {isProtected && <span>Protected</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
