# 9. RivalsTracker for player data, behind a request budget

## Context

RivalsIsland went offline around 2026-11-04 (API 521, site 1033) and has not returned. It had a published API, an API key, per-endpoint prices and an OpenAPI document; [ADR 8](0008-rivalsisland-for-player-data.md) records that arrangement.

RivalsTracker's site API (`https://api.rivalstracker.com/api`) answers plain server reads with no key and no challenge, and its `robots.txt` allows everything. It relays the same NetEase data: `aid` is the game uid, and match ids are the game's `match_uid`. It publishes no terms of reuse (only a privacy policy) and is not a supported developer contract; these are observed website endpoints that can change without notice.

## Decision

- `src/rivalstracker/` mirrors the old module: an endpoint registry (request, TTL, schema), a client that parses every body, typed errors, `toDomain` mappers, and static hero/map/season/rank tables taken from the game and the site's public bundle. Boundaries allow `domain` and `zod`.
- The page-facing endpoint names stay: `search`, `career`, `history`, `match`, `leaderboard`, `heroes`, `heroCareer`. `career`, `history` and `heroCareer` are one `GET /player/{uid}`, so the cache key is the request itself and a player page pays once. `heroes` is a local catalogue and never reaches the network.
- Requests are the budget: one per upstream call, capped by `PLAYER_DATA_REQUESTS_PER_DAY` (default 300) over the D1 ledger, now filtered to the current UTC day. A failed request still counts. The table keeps its `credit_ledger` name to avoid a migration; the code calls it `RequestLedger`.
- `PLAYER_DATA_MODE` is `fixtures` | `live` | `off`. The default is `fixtures`, and fixtures in a production build behaves like `off`; production must set `live` explicitly. Anything else shows the existing "Player data isn't available" state.
- Courtesy: `User-Agent: RivalsHub/1.0 (personal, non-commercial)` with no email, a 10s timeout, at most 2 concurrent requests per isolate, no background crawling, and calls only when a reader opens a page. TTLs: profile/history/hero cards 30 minutes, a finished match forever, search 1 day, leaderboard 15 minutes.
- Missing data stays missing: fields RivalsTracker does not report are nullable in `src/domain/player.ts` and render as "–". Never zero-fill or estimate.
- Player pages credit "Player data from RivalsTracker", linking to https://rivalstracker.com.

## Consequences

- A cold player page costs 1 request and a revisit 0 within 30 minutes.
- The operator was emailed before launch. The kill switch is one env var: `PLAYER_DATA_MODE=off`.
- RivalsTracker publishes no terms of reuse and the routes are unversioned. A changed response is detected as a contract error and cached as broken for 30 minutes rather than guessed at.
- The leaderboard is 500 rows upstream; we keep and render the top 100.
- Gaps vs RivalsIsland: signature hero, last online, career accuracy/damage/healing/MVP/SVP/final hits/headshot kills/solo kills/best kill streak, history page/category filters and pagination, per-match device and left-game flag, match map/season/team score, match AI and left-game flags, leaderboard last-played time, and the old `rs` points field.
