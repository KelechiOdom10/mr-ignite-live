# Shell and navigation

**What it is.** The header (nav, live island, search, spoiler toggle), the esports fixture strip, the footer and the mobile bottom nav.

## How to reach it

Every page.

## How to drive it

1. Open `/` and `/player/670067075` at 1440, then at 390.

## What proves it works

- `/`: the fixture strip of live and upcoming chips shows under the header. The footer shows "Live updates on · Liquipedia updated …".
- `/player/…`, `/players`, `/leaderboard`, `/game/…`: no fixture strip; the live island still shows when a match is live. The footer keeps the live status ("Live updates on · Liquipedia updated …") and reads "Player data from RivalsIsland; live scores from Liquipedia…". The Players nav item is current.
- At 390 the bottom nav shows Matches, Events, Players and Spoilers, with no horizontal overflow.

## Owning code

`src/ui/AppShell.tsx`, `src/ui/sections.ts` (`isPlayersPath`).
