# 10. mrvl hero-matrix for pro hero totals

## Context

`/drafts` counts plays, bans and protects only for series whose mrvl page the sync fetched, which it does within 12 hours of a series starting. Any series the sync missed is gone, and the page has no win rate. mrvl's analytics query returns the whole pro picture for a date range in one free request: per map, with play-time-weighted pick and win rates and real denominators.

The research recorded `POST https://www.mrvl.net/api/analytics/hero-matrix`. That route now answers 404; mrvl's own `/stats` page calls the Convex query `analytics:getHeroMatrix`, which answers unauthenticated from the host our client already uses. This decision follows the live query.

## Decision

- `src/mrvl/client.ts#heroMatrix` asks `analytics:getHeroMatrix` with `{startDate, endDate, dimension:"map", metric:"pickRate"}`, keeping the Convex client's User-Agent, 10s timeout and three typed errors. One response carries every cell's `value`, `heroGames`, `banCount`, `protectCount` and `weightedWinRate`, so other metrics need no extra request.
- The window is the last 30 days, matching mrvl's default: `endDate` is today (UTC) and `startDate` is 29 days earlier.
- `src/store/heroMatrix.ts` stores the mapped value under the separate KV key `hero-matrix:v1`, so the snapshot schema and `STORED_SNAPSHOT_VERSION` are untouched. The existing sync calls it once an hour at most; a missing or unparsable value is refetched. A failure keeps the last good value, logs, and never reaches the Liquipedia sync or the per-series stats.
- `src/domain/proHeroStats.ts` maps rows by `groupLabel`, not `groupId`: mrvl's `god-quarry` group is labelled "Thebes" and `god-quarry-domination` is God Quarry. Rates follow the formulas in mrvl's own metric tooltips: pick is play time over available play time, ban and protect divide by `eligibleGames` (twice the game count), and win is winning play time over total play time.
- The table shows win rate only from 10 games and says it is not a chance of winning. It follows the page's map filter, cannot follow the event filter because the source has no event split, and says "every region".
- Courtesy: one request an hour, no raw payload redistribution, and no published terms of reuse. This is the same posture as the rest of mrvl: small, read-only, and capped in our own code.

## Consequences

- `/drafts` gains a second table covering every pro game mrvl tracked in 30 days, including series the sync never fetched, while the existing table remains the only per-series window.
- The stored value is about 310 KB for 18 groups × 57 heroes. It is read on `/drafts` loads and written at most hourly.
- A changed response shape fails the Zod parse and is treated like any other mrvl error: the old totals stay and the next hour retries.
- The two tables count different things (per-series drafts vs every game in the window) and are never merged.
