# Drafts

verified-at: pending (feat/mrvl-hero-matrix)

`pages/drafts/`, `src/ui/drafts/`, `src/domain/draft.ts`, `src/domain/draftScope.ts`, `src/domain/proHeroStats.ts`, `src/store/heroMatrix.ts`.

Two tables, deliberately separate:

- **Series we synced** (`DraftTable`) counts plays, bans and protects over mrvl scoreboards the sync fetched within 12 hours of the series.
- **All pro games mrvl tracked** (`ProHeroTable`) covers the last 30 days from mrvl's hero-matrix query, including series the sync missed.

## Handles

| Where | What |
| --- | --- |
| `/drafts` | Both tables, filters, format cards |
| `/drafts?map=Yggdrasill%20Path` | Map filter; both tables narrow |
| `/drafts?event=<id>` | Event filter; only **Series we synced** narrows |
| `/drafts/simulator` | Practice draft board |

## Flows

1. Open `/drafts`. Both tables render when stats and hero totals are present.
2. Pick a map in the filter. The map filter controls **both** tables.
3. Pick an event. **Series we synced** narrows; **All pro games mrvl tracked** stays put, and its caption still says "every region".
4. Resize to 390×844. Both tables may scroll inside their own `overflow-x-auto` box; the page itself must not scroll sideways.
5. Win-rate cells show "—" below 10 games, and the note under the table says it is not a chance of winning.

## Evidence

- Screenshot `/drafts` at 1440 and 390.
- Screenshot `/drafts?map=<map>` after the filter, showing the new table's caption and rows changed.
- Screenshot with an event filter, showing the new table unchanged and the "every region" caption.
- Read `innerText` for the two table headings, the caption and a known hero row.

Fixtures mode (`PLAYER_DATA_MODE=fixtures`) covers only player data. The esports snapshot and mrvl hero totals still come from their normal sources; a first `/drafts` load may make one mrvl request and may take minutes while the Liquipedia snapshot builds.
