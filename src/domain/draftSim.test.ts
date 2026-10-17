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

describe("draft simulator edges", () => {
  it("refuses a team banning the same hero twice", () => {
    const moves = play([
      [0, "gambit"],
      [1, "loki"],
      [0, "mantis"],
    ]);
    // Step 3 is the second team's ban; it already banned Loki.
    expect(moveProblem(IGNITE_2026, moves, 1, "loki")).toEqual({ kind: "repeat" });
  });

  it("lets a team ban a hero the other team already banned", () => {
    const moves = play([
      [0, "gambit"],
      [1, "gambit"],
    ]);
    expect(outcome(moves).map((o) => o.bans)).toEqual([["gambit"], ["gambit"]]);
  });

  it("returns the turn to the team that undid its move in a both-teams step", () => {
    const moves = play([
      [0, "gambit"],
      [1, "loki"],
    ]);
    expect(currentTurn(IGNITE_2026, moves.slice(0, -1))).toEqual({
      step: 0,
      kind: "ban",
      waiting: [1],
    });
  });

  it("finishes after all 14 moves and refuses more", () => {
    let moves: SimMove[] = [];
    for (let n = 0; n < 40 && currentTurn(IGNITE_2026, moves); n++) {
      const turn = currentTurn(IGNITE_2026, moves);
      const camp = turn?.waiting[0] ?? 0;
      moves = applyMove(IGNITE_2026, moves, camp, `hero-${moves.length}`);
    }
    expect(moves).toHaveLength(14);
    expect(moveProblem(IGNITE_2026, moves, 0, "anyone")).toEqual({ kind: "finished" });
  });
});
