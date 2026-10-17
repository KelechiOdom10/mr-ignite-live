# Player page

**What it is.** A ranked player's rank, this season's record, career totals and recent matches, from RivalsIsland.

## How to reach it

`/player/670067075` (Sypeh) or `/player/1364513129` (TrqstMe, private history).

## How to drive it

1. Open `/player/670067075` at 1440.
2. Read the header line that starts "Ranked this season (10.5)".
3. Scroll the "Recent matches" list.
4. Open `/player/1364513129`.
5. Repeat at 390.

## What proves it works

- Sypeh's header reads "Ranked this season (10.5): 1W of 1 match · too few for a win rate (needs 10)". It shows no percentage.
- History shows a "Season 10.5 · this season" group ("1 match on this page"), then "Season 10.0" ("19 matches on this page").
- The career heading reads "Career · every season and mode".
- TrqstMe's header shows a real rate: "37W of 58 matches (64%)". History shows "Match history is private" and the career still shows.
- "Updated …" freshness is visible, and so is Refresh: "Refresh · 20 credits" on Sypeh, "Refresh · 10 credits" on TrqstMe (private history costs nothing). Don't press it.
- `/api/credits` still reports `mode: fixtures`. Its `spent` is simulated (see SKILL.md Doctor).

## Owning code

`pages/player/[uid].tsx`, `pages/player/[uid].server.ts`, `src/ui/players/PlayerHeader.tsx`, `src/ui/players/HistoryList.tsx`, `src/domain/player.ts` (`seasonRecord`, `groupBySeason`), `src/rivalsisland/toDomain.ts`.

## Gotchas

Only recorded uids have data in fixtures mode; any other uid shows "Not found".
