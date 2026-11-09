# 4. mrvl.net for player stats and early map results

## Context

MVP/SVP, heroes, bans and per-player stats exist only in NetEase's per-game records, fetched by replay ID from an undocumented official endpoint. No public source lists which replay belongs to which pro match: Liquipedia has no stats, the official esports site's match centre still runs its 2025 build, and rivalsdata, tracker.gg and marvelrivalsapi.com are blocked, ranked-only or down. mrvl.net links replays to pro matches (by hand or with private tooling) and serves the joined data from a public Convex backend with no auth.

## Decision

Read stats from mrvl's Convex queries (`matches:listSummary`, `matches:getPageData`). Link a Liquipedia series to mrvl's by start time (±3h) and team-name variants. Each sync makes three small list calls, and fetches full match pages only when mrvl's `updatedAt` changed, capped at six per run. Each map keeps its draft timeline (bans and protects in step order). Series indexed before that was kept get one refetch while still in the 12-hour lookback, inside the same cap and after changed series; the index marks them so they aren't fetched again. A finished series from the last 14 days that was never fetched (a fresh store, or downtime) is backfilled, at most two a run and after every live or recent series. Each backfilled series costs a stats write and an index rewrite against free KV's 1,000 writes a day, so a fresh store fills in over a few runs rather than one. A backfill that mrvl's recent list doesn't hold is dropped after one try, and one whose page keeps failing after three, recorded in `stats-backfill-misses:v1`, so neither keeps the sync calling mrvl. Map winners mrvl has before Liquipedia fill in as `mapOverrides`; Liquipedia always wins once it records a map. Credit mrvl on the match page.

## Consequences

- Stats and faster map results depend on an unofficial hobby backend that can change or disappear; failures are logged and scores fall back to Liquipedia alone.
- The app is for personal, local use, so it also shows mrvl's hero portraits and map art (through `/api/image`, cached a week). Ask the owner (mrvl Discord) before running it publicly, and replace their images if they say no.
- If replay IDs become available elsewhere, the stats model (`src/domain/stats.ts`) stays and only `src/mrvl/` is swapped for a NetEase client.
