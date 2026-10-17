import { describe, expect, it } from "vitest";

import { IGNITE_2026 } from "./draft";
import { applyMove, currentTurn, moveProblem, outcome, type SimMove } from "./draftSim";

function play(moves: [0 | 1, string][]): SimMove[] {
  return moves.reduce<SimMove[]>(
    (acc, [camp, hero]) => applyMove(IGNITE_2026, acc, camp, hero),
    [],
  );
}

describe("draft simulator", () => {
  it("lets either team go first in a both-teams step, then hands the protect to the first team", () => {
    const moves = play([[1, "loki"]]);
    expect(currentTurn(IGNITE_2026, moves)).toEqual({ step: 0, kind: "ban", waiting: [0] });
    expect(
      currentTurn(
        IGNITE_2026,
        play([
          [1, "loki"],
          [0, "loki"],
        ]),
      ),
    ).toEqual({
      step: 1,
      kind: "protect",
      waiting: [0],
    });
  });

  it("refuses a move out of turn without recording it", () => {
    const moves = play([
      [0, "gambit"],
      [1, "loki"],
    ]);
    expect(moveProblem(IGNITE_2026, moves, 1, "mantis")).toEqual({ kind: "not-your-turn" });
    expect(applyMove(IGNITE_2026, moves, 1, "mantis")).toEqual(moves);
  });

  it("stops a team banning a hero the other team protected", () => {
    const moves = play([
      [0, "gambit"],
      [1, "loki"],
      [0, "mantis"],
    ]);
    expect(moveProblem(IGNITE_2026, moves, 1, "mantis")).toEqual({ kind: "protected-by-opponent" });
  });

  it("lets a team protect a hero it banned, since its ban only binds the other team", () => {
    const moves = play([
      [0, "gambit"],
      [1, "loki"],
      [0, "gambit"],
    ]);
    expect(outcome(moves)[0]).toEqual({
      bans: ["gambit"],
      protects: ["gambit"],
      unavailable: ["loki"],
    });
  });
});
