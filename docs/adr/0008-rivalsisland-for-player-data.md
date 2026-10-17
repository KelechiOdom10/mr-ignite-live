# 8. RivalsIsland for player data, behind a credit budget

## Context

Ranked player data (search, rank, career, match history, match details, leaderboard) is only available from RivalsIsland's paid API: a free tier of 10,000 credits, priced per endpoint (search 5, career 10, hero career 10, 20 history rows 10, match detail 5, leaderboard and catalogues 1). Failed requests cost nothing. Many players keep their match history private. There is no tier-list, meta or per-player top-heroes source; the hero ranking endpoint is premium-only.

## Decision

- `src/rivalsisland/` holds an endpoint registry (path, cost, TTL and Zod schema per endpoint), a client that parses every body and the `x-credit-cost` header, and typed errors (private history and career, not found, premium, rate limit, contract change).
- `createPlayerData` (`src/store/playerData.ts`) is the only way to call it: D1 cache first, one in-flight request per key, then an atomic credit reservation that refuses a call when settled plus pending credits would pass `RIVALSISLAND_CREDIT_BUDGET`. Each reservation settles at the header's cost.
- Expired player data (career, history, hero cards) is served stale with a priced refresh; search, leaderboard and catalogues refetch on visit. Finished matches never expire. Private and not-found answers are remembered for 30 minutes.
- `RIVALSISLAND_MODE=fixtures` (the default) replays `test/fixtures/rivalsisland/` with an in-memory cache and ledger, so it never touches real credits or the D1 cache, and only runs in development; `live` needs `RIVALSISLAND_API_KEY` in `.env`.
- A response that breaks our schema is remembered for 30 minutes, so a changed API isn't paid for on every view.
- Never called: detailed match history (100 credits per 20) and premium endpoints.

## Consequences

- A cold player costs 25 credits (search 5, career 10, 20 Competitive matches 10), 30 with one match detail, 0 on a revisit.
- A settled cost above the registry price is logged; the next reservation counts the real spend, so at most one call can overshoot before the price is corrected.
- A crash between reserving and settling leaves a pending reservation that keeps counting against the budget; that errs on the side of not spending.
- Changing the budget is an env change, which needs Kelechi's approval past the agreed amount.
