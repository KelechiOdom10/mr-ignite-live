import type { DraftFormat, DraftStep, DraftSummary } from "./draft";

export type Camp = 0 | 1;

export interface SimMove {
  step: number;
  camp: Camp;
  kind: DraftStep["kind"];
  heroId: string;
}

function actors(step: DraftStep): Camp[] {
  return step.actor === "both" ? [0, 1] : [step.actor === "first" ? 0 : 1];
}

export interface Turn {
  step: number;
  kind: DraftStep["kind"];
  /** Teams still to move in this step; both steps let either team go first. */
  waiting: Camp[];
}

/** Null once every step is done. */
export function currentTurn(format: DraftFormat, moves: readonly SimMove[]): Turn | null {
  for (const [step, s] of format.steps.entries()) {
    const waiting = actors(s).filter(
      (camp) => !moves.some((m) => m.step === step && m.camp === camp),
    );

    if (waiting.length > 0) return { step, kind: s.kind, waiting };
  }

  return null;
}

export type MoveProblem =
  | { kind: "finished" }
  | { kind: "not-your-turn" }
  | { kind: "repeat" }
  | { kind: "banned" }
  | { kind: "protected-by-opponent" };

export function moveProblem(
  format: DraftFormat,
  moves: readonly SimMove[],
  camp: Camp,
  heroId: string,
): MoveProblem | null {
  const turn = currentTurn(format, moves);

  if (!turn) return { kind: "finished" };

  if (!turn.waiting.includes(camp)) return { kind: "not-your-turn" };

  if (moves.some((m) => m.camp === camp && m.kind === turn.kind && m.heroId === heroId)) {
    return { kind: "repeat" };
  }

  if (
    turn.kind === "ban" &&
    !format.sharedBans &&
    moves.some((m) => m.kind === "ban" && m.heroId === heroId)
  ) {
    return { kind: "banned" };
  }

  if (
    turn.kind === "ban" &&
    moves.some((m) => m.camp !== camp && m.kind === "protect" && m.heroId === heroId)
  ) {
    return { kind: "protected-by-opponent" };
  }

  return null;
}

/** Returns the moves unchanged when the move isn't allowed; check `moveProblem` to say why. */
export function applyMove(
  format: DraftFormat,
  moves: readonly SimMove[],
  camp: Camp,
  heroId: string,
): SimMove[] {
  const turn = currentTurn(format, moves);

  if (!turn || moveProblem(format, moves, camp, heroId)) return [...moves];

  return [...moves, { step: turn.step, camp, kind: turn.kind, heroId }];
}

export interface CampOutcome {
  bans: string[];
  protects: string[];
  /** Heroes the other team banned, which this team can't play. */
  unavailable: string[];
}

export function outcome(
  format: DraftFormat,
  moves: readonly SimMove[],
): [CampOutcome, CampOutcome] {
  const of = (camp: Camp, kind: DraftStep["kind"]) =>
    moves.flatMap((m) => (m.camp === camp && m.kind === kind ? [m.heroId] : []));

  const side = (camp: Camp): CampOutcome => ({
    bans: of(camp, "ban"),
    protects: of(camp, "protect"),
    unavailable: [
      ...new Set(
        format.banBlocks === "both teams"
          ? [...of(0, "ban"), ...of(1, "ban")]
          : of(camp === 0 ? 1 : 0, "ban"),
      ),
    ],
  });

  return [side(0), side(1)];
}

export interface SlotPlan {
  bans: number;
  protects: number;
}

/** How many bans and protects a team makes over the whole format: the slots its board shows. */
export function slotPlan(format: DraftFormat, camp: Camp): SlotPlan {
  const mine = format.steps.filter((s) => actors(s).includes(camp));

  return {
    bans: mine.filter((s) => s.kind === "ban").length,
    protects: mine.filter((s) => s.kind === "protect").length,
  };
}

export interface TimelineStep {
  index: number;
  actor: DraftStep["actor"];
  kind: DraftStep["kind"];
  picks: { camp: Camp; heroId: string }[];
  state: "done" | "current" | "upcoming";
}

/** Every step of the format with what was picked in it, and which step is being played. */
export function timeline(format: DraftFormat, moves: readonly SimMove[]): TimelineStep[] {
  const current = currentTurn(format, moves)?.step ?? null;

  return format.steps.map((s, index) => ({
    index,
    actor: s.actor,
    kind: s.kind,
    picks: moves.flatMap((m) => (m.step === index ? [{ camp: m.camp, heroId: m.heroId }] : [])),
    state:
      current === null || index < current ? "done" : index === current ? "current" : "upcoming",
  }));
}

export interface ProRate {
  /** Share of pro team drafts that banned the hero. */
  banned: number;
  /** Share of team drafts with protects known that protected it; null when none are known. */
  protected: number | null;
  pick?: number | null;
  win?: number | null;
}

/** Pro ban and protect shares per hero, to show beside the pool while practising. */
export function proRates(summary: DraftSummary): Record<string, ProRate> {
  const { teamDrafts, withProtects } = summary.sample;

  if (teamDrafts === 0) return {};

  return Object.fromEntries(
    summary.rows.map((r) => [
      r.hero.id,
      {
        banned: r.banned / teamDrafts,
        protected: withProtects > 0 ? r.protected / withProtects : null,
      },
    ]),
  );
}
