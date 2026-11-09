# Player pages

**What it is.** A ranked player's rank, climb, career and recent matches (`/player/…`), the Players hub with search, favourites and recently viewed players (`/players`), and the leaderboard (`/leaderboard`), all from RivalsTracker.

## How to reach it

`/player/670067075` (Sypeh) or `/player/1364513129` (TrqstMe, private history). `/players` and `/leaderboard` from the Players nav item.

## How to drive it

1. Open `/player/670067075` at 1440 and read the rank card, the rank score card, the career groups and "Recent matches".
2. Open `/player/1364513129`.
3. Open `/leaderboard`, then `/players`. Star Sypeh first if Favourites is empty (local D1 only).
4. Repeat at 390.

## What proves it works

- Sypeh's header reads "UID 670067075 · Level 84" (the source reports no per-match platform, so there is no platform chip). The rank card shows the One Above All badge, "Season 10.5", "5358 RS", "This season 18W of 28 matches (64%)" and "Peak One Above All 5358 RS".
- The rank score card reads "Rank score · last 20 ranked", "+35 RS · 12W 8L · won last 2", with a rising line and 20 result chips, oldest first.
- Career groups: Combat (KDA 10.94, K/D 4.48, Accuracy "–", Damage "–"), Impact (MVP "–", SVP "–", Solo kills "–", Best streak "–"), Volume (Matches 74, Win rate 77.0%, Play time 5h, Healing "–"). The dashes are the fields RivalsTracker does not report.
- History shows one "Season 10.5 · this season" group ("20 matches on this page") with no paging link; the source returns the latest 20. Heroes sit to the right at 1440 and below the matches at 390.
- TrqstMe shows "58W of 100 matches (58%)". The rank score card says "Match history is private, so there's no rank trend". "Match history is private" shows once, under Recent matches, and the career still shows.
- Refresh reads "Refresh" (one request); don't press it while checking.
- `/leaderboard`: the platform switch shows PC, PlayStation and Xbox icons in a segmented control, and every row shows its rank badge.
- `/players`: favourites are cards with avatar, club, rank badge and the last five recent results. Recently viewed lists players opened in this browser with their rank. "Top of the leaderboard" shows five rows if the PC leaderboard is cached. All of it comes from the cache: `spent` on `/api/credits` doesn't move.
- At 390 nothing scrolls sideways.
- `/api/credits` still reports `mode: fixtures` with `spent`/`pending` request counts; both are simulated (see SKILL.md Doctor).

## Owning code

`pages/player/[uid].tsx`, `pages/players.tsx`, `pages/leaderboard.tsx`, `src/ui/players/` (`RankCard`, `RankTrendCard`, `CareerGroups`, `PlayerCard`, `RankIcon`, `PlatformIcon`), `src/players.ts` (`cachedPlayerCards`, `cachedLeaderboardTop`), `src/domain/player.ts` (`seasonRecord`, `groupBySeason`, `rankTrend`), `src/rivalstracker/toDomain.ts`. Rank badges live in `public/ranks/`.

## Gotchas

- Only recorded uids have data in fixtures mode; any other uid shows "Not found". The match page shows no map, season or team score because RivalsTracker's match payload omits them.
- The fixtures cache is in memory and resets when the dev server reloads `src/players.ts`, so "Top of the leaderboard" and favourite ranks only show after the leaderboard or player has been opened since.
