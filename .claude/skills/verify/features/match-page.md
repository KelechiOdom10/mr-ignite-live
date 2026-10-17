# Match page

**What it is.** One esports series: live score, streams, VODs, maps with MVPs, per-map player stats from mrvl.net, form and head to head.

## How to reach it

Any match card or strip chip, or `/match/KtMVxkwRyz_R2M4` (RAD vs Pulsar Esports, Ignite 2026 Stage 2 EMEA) while it's in the snapshot.

## How to drive it

1. Open the match with Hide spoilers off.
2. Read the Maps section and the Player stats tabs.
3. Turn Hide spoilers on and reload.

## What proves it works

- With spoilers shown, a note reads "Liquipedia and mrvl.net disagree on map 1 (Liquipedia: Krakoa; mrvl: Celestial Husk)…". The map 1 card shows "mrvl says Celestial Husk".
- Every stats row has a "Look up <name> among ranked players" link to `/players?name=<name>`. The table says names aren't tied to ranked accounts.
- With spoilers hidden, maps read "Result hidden", stats say they're hidden, and no conflict note shows.

## Owning code

`pages/match/[id].tsx`, `src/ui/StatsPanel.tsx`, `src/domain/maps.ts` (`mapNameConflicts`), `src/domain/matchView.ts`.

## Gotchas

Esports data is live from Liquipedia and mrvl, so a given match can leave the 30-day home scope. Pick any finished match with stats if this one is gone, and assert on the shape.
