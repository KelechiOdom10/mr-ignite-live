import { Ban, RotateCcw, Shield, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";

import type { DraftFormat } from "@/domain/draft";
import {
  applyMove,
  type Camp,
  currentTurn,
  type MoveProblem,
  moveProblem,
  outcome,
  type ProRate,
  type SimMove,
  slotPlan,
  timeline,
} from "@/domain/draftSim";
import type { Hero } from "@/domain/stats";
import { cn } from "@/lib/utils";

import { HeroPortrait } from "../StatsPanel";
import { ACTOR_SHORT } from "./FormatCard";

const TEAM: Record<Camp, string> = { 0: "First team", 1: "Second team" };
const ROLES = ["All", "Vanguard", "Duelist", "Strategist"] as const;

const PROBLEM: Record<MoveProblem["kind"], string> = {
  finished: "The draft is over. Undo a move or start again.",
  "not-your-turn": "It's the other team's move.",
  repeat: "That team has already done that with this hero.",
  "protected-by-opponent": "The other team protected this hero, so it can't be banned.",
};

function percent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

function Slot({ hero, kind }: { hero: Hero | undefined; kind: "ban" | "protect" }) {
  if (!hero) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "size-[26px] shrink-0 rounded-md border border-dashed sm:size-9",
          kind === "protect" ? "border-win/40" : "border-border-strong",
        )}
      />
    );
  }
  return (
    <span
      className={cn(
        "relative shrink-0 rounded-md ring-1",
        kind === "protect" ? "ring-win/60" : "ring-live/60",
      )}
      title={hero.name}
    >
      <HeroPortrait
        hero={hero}
        size={36}
        className={cn("max-sm:!size-[26px]", kind === "ban" && "grayscale")}
      />
      <span className="sr-only">{hero.name}</span>
    </span>
  );
}

/** One team's side of the board: its ban and protect slots, filling in as it moves. */
function TeamBoard({
  camp,
  format,
  bans,
  protects,
  byId,
  moving,
  canChoose,
  onChoose,
}: {
  camp: Camp;
  format: DraftFormat;
  bans: string[];
  protects: string[];
  byId: Map<string, Hero>;
  moving: boolean;
  canChoose: boolean;
  onChoose: () => void;
}) {
  const plan = slotPlan(format, camp);
  const row = (ids: string[], count: number, kind: "ban" | "protect") => (
    <div className="flex gap-1 sm:flex-wrap sm:gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <Slot key={`${kind}-${i}`} hero={ids[i] ? byId.get(ids[i]) : undefined} kind={kind} />
      ))}
    </div>
  );
  const heading = (
    <span className="flex items-center justify-between gap-2">
      <span className="font-medium whitespace-nowrap">{TEAM[camp]}</span>
      {moving && (
        <span className="rounded bg-primary px-1.5 py-0.5 text-[0.7rem] font-medium text-primary-foreground">
          Moving
        </span>
      )}
      {!moving && canChoose && (
        <span className="hidden text-[0.7rem] whitespace-nowrap text-muted-foreground sm:inline">
          Tap to move
        </span>
      )}
    </span>
  );
  return (
    <section
      aria-label={TEAM[camp]}
      className={cn(
        "grid gap-2 rounded-lg border p-2 transition-colors sm:p-3",
        moving ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      {canChoose ? (
        <button
          type="button"
          aria-pressed={moving}
          onClick={onChoose}
          className="rounded text-left outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary"
        >
          {heading}
        </button>
      ) : (
        heading
      )}
      <div className="grid gap-1">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Ban className="size-3" aria-hidden /> Bans
          <span className="hidden sm:inline">· the other team can&apos;t play these</span>
        </span>
        {row(bans, plan.bans, "ban")}
      </div>
      <div className="grid gap-1">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Shield className="size-3" aria-hidden /> Protects
          <span className="hidden sm:inline">· the other team can&apos;t ban these</span>
        </span>
        {row(protects, plan.protects, "protect")}
      </div>
    </section>
  );
}

export function DraftSimulator({
  format,
  heroes,
  rates,
  proDrafts,
}: {
  format: DraftFormat;
  heroes: Hero[];
  rates: Record<string, ProRate>;
  proDrafts: number;
}) {
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
  const choosable = turn !== null && turn.waiting.length > 1;
  const sides = outcome(moves);
  const steps = timeline(format, moves);
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

  const status =
    turn && acting !== null
      ? `Step ${turn.step + 1} of ${format.steps.length} · ${TEAM[acting]} ${turn.kind === "ban" ? "bans" : "protects"}`
      : "Draft complete";

  return (
    <div className="grid gap-5">
      {/* The board stays in view on wider screens, so picking never scrolls the result away. */}
      <div className="z-20 -mx-4 bg-background/95 px-4 pb-2 backdrop-blur [@media(min-width:768px)_and_(min-height:640px)]:sticky [@media(min-width:768px)_and_(min-height:640px)]:top-14 sm:mx-0 sm:px-0">
        <div className="grid gap-3 rounded-xl border bg-card p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium" aria-live="polite">
              {status}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMoves(moves.slice(0, -1));
                  setProblem(null);
                }}
                disabled={moves.length === 0}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm disabled:opacity-50"
              >
                <Undo2 className="size-3.5" aria-hidden /> Undo
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoves([]);
                  setCamp(0);
                  setProblem(null);
                }}
                disabled={moves.length === 0}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm disabled:opacity-50"
              >
                <RotateCcw className="size-3.5" aria-hidden /> Start again
              </button>
            </div>
          </div>
          {choosable && (
            <p className="text-xs text-muted-foreground">
              Both teams ban in this step. Tap a team to pick its ban; the other team goes next.
            </p>
          )}
          {problem && (
            <p role="alert" className="text-sm text-live">
              {problem}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {([0, 1] as const).map((c) => (
              <TeamBoard
                key={c}
                camp={c}
                format={format}
                bans={sides[c].bans}
                protects={sides[c].protects}
                byId={byId}
                moving={acting === c}
                canChoose={choosable && (turn?.waiting.includes(c) ?? false)}
                onChoose={() => setCamp(c)}
              />
            ))}
          </div>

          <ol aria-label="Draft order" className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {steps.map((s) => (
              <li
                key={s.index}
                aria-current={s.state === "current" ? "step" : undefined}
                className={cn(
                  "flex min-w-max items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
                  s.state === "current" && "border-primary bg-primary/10 text-foreground",
                  s.state === "upcoming" && "text-muted-foreground",
                  s.state === "done" && "bg-muted/40 text-muted-foreground",
                  s.kind === "protect" && s.state !== "current" && "border-win/30",
                )}
              >
                <span className="font-mono">{s.index + 1}</span>
                <span>
                  {ACTOR_SHORT[s.actor]} {s.kind}
                </span>
                {s.picks.map((p) => {
                  const hero = byId.get(p.heroId);
                  return hero ? (
                    <span key={`${p.camp}-${p.heroId}`} title={`${TEAM[p.camp]}: ${hero.name}`}>
                      <HeroPortrait hero={hero} size={18} />
                      <span className="sr-only">{`${TEAM[p.camp]}: ${hero.name}`}</span>
                    </span>
                  ) : null;
                })}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <section aria-labelledby="hero-pool" className="grid gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="mr-auto">
            <h2 id="hero-pool" className="font-medium">
              Heroes
            </h2>
            {proDrafts > 0 && (
              <p className="text-xs text-muted-foreground">
                B and P: how often pros banned and protected each hero, from {proDrafts} team drafts
                on cached maps that followed this draft step for step.
              </p>
            )}
          </div>
          <div
            className="flex rounded-xl bg-card p-1 ring-1 ring-border ring-inset"
            role="group"
            aria-label="Role"
          >
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={role === r}
                onClick={() => setRole(r)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-sm text-muted-foreground hover:text-foreground",
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
              className="h-9 w-44 rounded-md border bg-background px-2 text-base sm:text-sm"
            />
          </label>
        </div>
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
          {shown.map((h) => {
            const outFor = ([0, 1] as const).filter((c) => sides[c].unavailable.includes(h.id));
            const protectedBy = ([0, 1] as const).filter((c) => sides[c].protects.includes(h.id));
            const rate = rates[h.id];
            const outForActing = acting !== null && outFor.includes(acting);
            const state = [
              outFor.length === 2
                ? "Out for both teams"
                : outFor.length === 1
                  ? `Out for ${TEAM[outFor[0] ?? 0].toLowerCase()}`
                  : null,
              protectedBy.length > 0 ? "Protected" : null,
            ].filter(Boolean);
            const proLine = rate
              ? `Pro drafts: banned ${percent(rate.banned)}${rate.protected === null ? "" : `, protected ${percent(rate.protected)}`}`
              : "Not seen in cached pro drafts";
            return (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => choose(h.id)}
                  aria-label={[h.name, ...state, proLine].join(". ")}
                  className={cn(
                    "relative grid w-full justify-items-center gap-1 rounded-lg border p-2 text-center transition-colors hover:bg-accent",
                    outForActing && "opacity-45",
                  )}
                >
                  <span aria-hidden="true" className="relative">
                    <HeroPortrait
                      hero={h}
                      size={48}
                      className={outFor.length === 2 ? "grayscale" : undefined}
                    />
                    {protectedBy.length > 0 && (
                      <Shield className="absolute -right-1.5 -bottom-1.5 size-4 fill-win text-background" />
                    )}
                    {outFor.length > 0 && (
                      <Ban className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-background text-live" />
                    )}
                  </span>
                  <span aria-hidden="true" className="w-full truncate text-xs">
                    {h.name}
                  </span>
                  <span
                    aria-hidden="true"
                    className="font-mono text-[0.65rem] whitespace-nowrap text-muted-foreground tabular-nums"
                  >
                    {rate ? `B ${percent(rate.banned)}` : "–"}
                    {rate?.protected != null && (
                      <span className="hidden sm:inline">{` · P ${percent(rate.protected)}`}</span>
                    )}
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
