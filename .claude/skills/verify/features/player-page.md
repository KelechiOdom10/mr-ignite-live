# Player pages

**What it is.** A ranked player's rank, climb, career and recent matches (`/player/…`), the Players hub with search, favourites and recently viewed players (`/players`), and the leaderboard (`/leaderboard`), all from RivalsIsland.

## How to reach it

`/player/670067075` (Sypeh) or `/player/1364513129` (TrqstMe, private history). `/players` and `/leaderboard` from the Players nav item.

## How to drive it

1. Open `/player/670067075` at 1440 and read the rank card, the rank score card, the career groups and "Recent matches".
2. Open `/player/1364513129`.
3. Open `/leaderboard`, then `/players`. Star Sypeh first if Favourites is empty (local D1 only).
4. Repeat at 390.

## What proves it works

- Sypeh's header reads "UID 670067075 · Level 84 · PC". The rank card shows the One Above All badge, "Season 10.5", "204 RS", "This season 1W of 1 match · win rate after 10" (no percentage) and "Peak One Above All 204 RS".
- The rank score card reads "Rank score · last 20 ranked", "+137 RS · 15W 5L · won last 3", with a rising line and 20 result chips, oldest first.
- Career groups: Combat (KDA 9.45, K/D 4.38), Impact (MVP 601 "24% of matches", Solo kills 3,136, Best streak 28), Volume (Matches 2,454, Win rate 75.3%).
- History shows a "Season 10.5 · this season" group ("1 match on this page"), then "Season 10.0" ("19 matches on this page"). Heroes sit to the right at 1440 and below the matches at 390.
- TrqstMe shows "37W of 58 matches (64%)". The rank score card says "Match history is private, so there's no rank trend". "Match history is private" shows once, under Recent matches, and the career still shows.
- Refresh reads "Refresh · 20 credits" on Sypeh and "Refresh · 10 credits" on TrqstMe (private history costs nothing). Don't press it.
- `/leaderboard`: the platform switch shows PC, PlayStation and Xbox icons in a segmented control, and every row shows its rank badge.
- `/players`: favourites are cards with avatar, club, rank badge, platform icon and the last five competitive results. Recently viewed lists players opened in this browser with their rank. "Top of the leaderboard" shows five rows if the PC leaderboard is cached. All of it comes from the cache: `spent` on `/api/credits` doesn't move.
- At 390 nothing scrolls sideways.
- `/api/credits` still reports `mode: fixtures`. Its `spent` is simulated (see SKILL.md Doctor).

## Owning code

`pages/player/[uid].tsx`, `pages/players.tsx`, `pages/leaderboard.tsx`, `src/ui/players/` (`RankCard`, `RankTrendCard`, `CareerGroups`, `PlayerCard`, `RankIcon`, `PlatformIcon`), `src/players.ts` (`cachedPlayerCards`, `cachedLeaderboardTop`), `src/domain/player.ts` (`seasonRecord`, `groupBySeason`, `rankTrend`), `src/rivalsisland/toDomain.ts`. Rank badges live in `public/ranks/`.

## Gotchas

- Only recorded uids have data in fixtures mode; any other uid shows "Not found".
- The fixtures cache is in memory and resets when the dev server reloads `src/players.ts`, so "Top of the leaderboard" and favourite ranks only show after the leaderboard or player has been opened since.
