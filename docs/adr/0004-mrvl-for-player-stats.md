# 4. mrvl.net for player stats and early map results

## Context

MVP/SVP, heroes, bans and per-player stats exist only in NetEase's per-game records, fetched by replay ID from an undocumented official endpoint. No public source lists which replay belongs to which pro match: Liquipedia has no stats, the official esports site's match centre still runs its 2025 build, and rivalsdata, tracker.gg and marvelrivalsapi.com are blocked, ranked-only or down. mrvl.net links replays to pro matches (by hand or with private tooling) and serves the joined data from a public Convex backend with no auth.

## Decision

Read stats from mrvl's Convex queries (`matches:listSummary`, `matches:getPageData`). Link a Liquipedia series to mrvl's by start time (±3h) and team-name variants. Each sync makes three small list calls, and fetches full match pages only when mrvl's `updatedAt` changed, capped at six per run. Map winners mrvl has before Liquipedia fill in as `mapOverrides`; Liquipedia always wins once it records a map. Credit mrvl on the match page.

## Consequences

- Stats and faster map results depend on an unofficial hobby backend that can change or disappear; failures are logged and scores fall back to Liquipedia alone.
- Out of courtesy, the owner should be asked (mrvl Discord) before this runs publicly.
- If replay IDs become available elsewhere, the stats model (`src/domain/stats.ts`) stays and only `src/mrvl/` is swapped for a NetEase client.
