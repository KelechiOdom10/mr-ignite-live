# Global search

**What it is.** ⌘K finds teams, matches, events and players, including players you've opened and any name you type as a ranked lookup.

## How to reach it

The Search button in the header, or ⌘K on any page.

## How to drive it

1. Open `/player/670067075` once, so Sypeh is recorded as recently viewed (localStorage `rivals-hub:recent-players`).
2. Press ⌘K, click the combobox, and type `Sypeh` with `human.type`.
3. Choose "Search ranked players for “Sypeh”".
4. Reopen ⌘K, press Escape, and reopen it to confirm no stale lookup is offered.

## What proves it works

- After typing, the options are exactly "Sypeh · Recently viewed" and "Search ranked players for “Sypeh” · Exact in-game name".
- Choosing the lookup lands on `/players?name=Sypeh&focus=name`. The name field holds `Sypeh` and has focus, and **nothing was searched**. `/api/credits` `spent` doesn't move until Search is pressed.
- An empty query lists "Find a player by name" and "Leaderboard" under Players.

## Owning code

`src/ui/SearchPalette.tsx`, `src/ui/players/recentPlayers.ts`, `src/domain/player.ts` (`parseRecentPlayers`, `rememberPlayer`, `searchableName`), `pages/players.server.ts`, `pages/players.tsx`, `src/ui/players/SearchForm.tsx`.

## Gotchas

The vendored palette (`src/components/motion/command-palette.tsx`) keeps its query private. `SearchPalette` reads the typed text from input events whose placeholder is its own `PLACEHOLDER`, so changing that string in one place only breaks the lookup.
