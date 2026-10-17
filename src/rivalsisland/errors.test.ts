import { describe, expect, it } from "vitest";

import {
  CareerPrivateError,
  CreditBudgetExceededError,
  errorFor,
  MatchHistoryPrivateError,
  problemOf,
  RivalsIslandContractError,
} from "./errors";

describe("problemOf", () => {
  it("keeps private profiles as their own states and turns other failures into something showable", () => {
    expect(problemOf(new MatchHistoryPrivateError("", 0))).toBe("history_private");
    expect(problemOf(new CareerPrivateError("", 0))).toBe("career_private");
    expect(problemOf(errorFor(404, "player_not_found", 0))).toBe("not_found");
    expect(problemOf(new CreditBudgetExceededError(10, 200))).toBe("budget_reached");
    expect(problemOf(errorFor(402, undefined, 0))).toBe("out_of_credits");
    expect(problemOf(errorFor(401, undefined, 0))).toBe("not_configured");
    expect(problemOf(new RivalsIslandContractError("career", "x", 10))).toBe("unavailable");
  });

  it("rethrows bugs instead of hiding them behind a friendly message", () => {
    expect(problemOf(new TypeError("undefined is not a function"))).toBeNull();
  });
});
