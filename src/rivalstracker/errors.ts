import type { PlayerProblem } from "@/domain/player";

/** Every failure carries the requests it used; a failed request still counts against the day's budget. */
export class RivalsTrackerError extends Error {
  constructor(
    message: string,
    readonly requests: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends RivalsTrackerError {}

/** The profile is visible but its match history is hidden. */
export class MatchHistoryPrivateError extends RivalsTrackerError {}

/** The profile hides overview/career stats. */
export class CareerPrivateError extends RivalsTrackerError {}

export class RateLimitedError extends RivalsTrackerError {}

export class UpstreamUnavailableError extends RivalsTrackerError {}

export class NotConfiguredError extends RivalsTrackerError {}

/** The response didn't match our schema: the site changed, so we stop rather than guess. */
export class RivalsTrackerContractError extends RivalsTrackerError {
  constructor(
    readonly endpoint: string,
    readonly issues: string,
    requests: number,
  ) {
    super(`RivalsTracker ${endpoint} response changed shape: ${issues}`, requests);
  }
}

/** Our own budget guard refused the call; nothing was sent. */
export class RequestBudgetExceededError extends Error {
  constructor(
    readonly expected: number,
    readonly budget: number,
  ) {
    super(`Calling would exceed the RivalsTracker request budget of ${budget}`);
    this.name = "RequestBudgetExceededError";
  }
}

export function errorFor(status: number, requests: number): RivalsTrackerError {
  if (status === 404) return new NotFoundError("Not found on RivalsTracker", requests);

  if (status === 429) return new RateLimitedError("Rate limited by RivalsTracker", requests);

  return new UpstreamUnavailableError(`RivalsTracker returned HTTP ${status}`, requests);
}

/** The one place a failure becomes something a page can show; anything unexpected is rethrown. */
export function problemOf(cause: unknown): PlayerProblem | null {
  if (cause instanceof MatchHistoryPrivateError) return "history_private";

  if (cause instanceof CareerPrivateError) return "career_private";

  if (cause instanceof NotFoundError) return "not_found";

  if (cause instanceof RequestBudgetExceededError) return "budget_reached";

  if (cause instanceof NotConfiguredError) return "not_configured";

  if (cause instanceof RivalsTrackerError) return "unavailable";

  return null;
}
