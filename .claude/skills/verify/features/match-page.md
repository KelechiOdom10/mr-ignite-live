# Match page

**What it is.** One esports series: live score, streams, VODs, maps with MVPs, per-map player stats from mrvl.net, form and head to head.

## How to reach it

Any match card or strip chip, or `/match/KtMVxkwRyz_R2M4` (RAD vs Pulsar Esports, Ignite 2026 Stage 2 EMEA) while it's in the snapshot.

## How to drive it

1. Open the match with Hide spoilers off.
2. Read the Maps section and the Player stats tabs.
3. Turn Hide spoilers on and reload.

## What proves it works

- With spoilers shown, a note reads "Two sources name the same map differently: map 1 (Liquipedia: Krakoa; mrvl.net: Celestial Husk)…". The map 1 card shows "mrvl says Celestial Husk".
- Every stats row has a "Look up <name> among ranked players" link to `/players?name=<name>`. The table says names aren't tied to ranked accounts.
- Every hero a player used shows as a portrait, most played first; a single hero shows its name. Clicking one opens its time, share, K/D/A, final hits, damage, taken and healing (accuracy per map only). Its trigger's accessible name carries the same numbers. Hovering a portrait shows a pointer, brightens it and underlines a shown name. There's no ring. Series with no per-hero lines say only how long each hero was played.
- On a map tab, each team's bans are grey; hovering one lifts it to half grayscale (opacity 0.85, `grayscale(0.5)`).
- At 390 and 360 the page doesn't scroll sideways, with or without a breakdown open.
- With spoilers hidden, maps read "Result hidden", stats say they're hidden, and no conflict note shows.

## Owning code

`pages/match/[id].tsx`, `src/ui/StatsPanel.tsx`, `src/domain/maps.ts` (`mapNameConflicts`), `src/domain/matchView.ts`.

## Gotchas

Esports data is live from Liquipedia and mrvl, so a given match can leave the 30-day home scope. Pick any finished match with stats if this one is gone, and assert on the shape.
