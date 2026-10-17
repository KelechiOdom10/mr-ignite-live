/** Every failure carries the credits RivalsIsland charged for it (failed requests are normally free). */
export class RivalsIslandError extends Error {
  constructor(
    message: string,
    readonly creditCost: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class MatchHistoryPrivateError extends RivalsIslandError {}
export class CareerPrivateError extends RivalsIslandError {}
export class PremiumRequiredError extends RivalsIslandError {}
export class InsufficientCreditsError extends RivalsIslandError {}
export class NotFoundError extends RivalsIslandError {}
export class RateLimitedError extends RivalsIslandError {}
export class UpstreamUnavailableError extends RivalsIslandError {}
export class NotConfiguredError extends RivalsIslandError {}

/** The response didn't match our schema: the API changed, so we stop rather than guess. */
export class RivalsIslandContractError extends RivalsIslandError {
  constructor(
    readonly endpoint: string,
    readonly issues: string,
    creditCost: number,
  ) {
    super(`RivalsIsland ${endpoint} response changed shape: ${issues}`, creditCost);
  }
}

/** Our own budget guard refused the call; nothing was sent. */
export class CreditBudgetExceededError extends Error {
  constructor(
    readonly expected: number,
    readonly budget: number,
  ) {
    super(`Calling would exceed the RivalsIsland credit budget of ${budget}`);
    this.name = "CreditBudgetExceededError";
  }
}

export function errorFor(
  status: number,
  code: string | undefined,
  cost: number,
): RivalsIslandError {
  if (code === "match_history_private") {
    return new MatchHistoryPrivateError("Match history is private", cost);
  }
  if (code === "career_private") return new CareerPrivateError("Career is private", cost);
  if (code === "premium_required") return new PremiumRequiredError("Needs a premium key", cost);
  if (status === 402) return new InsufficientCreditsError("Out of RivalsIsland credits", cost);
  if (status === 401) return new NotConfiguredError("RivalsIsland rejected the API key", cost);
  if (status === 404) return new NotFoundError("Not found on RivalsIsland", cost);
  if (status === 429) return new RateLimitedError("Rate limited by RivalsIsland", cost);
  return new UpstreamUnavailableError(`RivalsIsland returned HTTP ${status}`, cost);
}
