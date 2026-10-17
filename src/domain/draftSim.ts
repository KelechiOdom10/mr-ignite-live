import type { DraftFormat, DraftStep } from "./draft";

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

export function outcome(moves: readonly SimMove[]): [CampOutcome, CampOutcome] {
  const of = (camp: Camp, kind: DraftStep["kind"]) =>
    moves.filter((m) => m.camp === camp && m.kind === kind).map((m) => m.heroId);
  const side = (camp: Camp): CampOutcome => ({
    bans: of(camp, "ban"),
    protects: of(camp, "protect"),
    unavailable: [...new Set(of(camp === 0 ? 1 : 0, "ban"))],
  });
  return [side(0), side(1)];
}
