# Drafts

verified-at: pending (feat/draft-map-picker)

`pages/drafts/`, `src/ui/drafts/`, `src/domain/draft.ts`, `src/domain/draftScope.ts`, `src/domain/proHeroStats.ts`, `src/domain/simMap.ts`, `src/store/heroMatrix.ts`.

Two tables, deliberately separate:

- **Ignite picks and bans** (`DraftTable`) counts plays, bans and protects over mrvl scoreboards the sync fetched within 12 hours of the series.
- **All pro games, last 30 days** (`ProHeroTable`) covers the last 30 days from mrvl's hero-matrix query, including series the sync missed.

## Handles

| Where                                     | What                                                                |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `/drafts`                                 | Both tables, filters, format cards                                  |
| `/drafts?map=Yggdrasill%20Path`           | Map filter; both tables narrow                                      |
| `/drafts?event=<id>`                      | Event filter; only **Ignite picks and bans** narrows                |
| `/drafts/simulator`                       | Practice draft board, all-map mrvl rates                            |
| `/drafts/simulator?map=yggdrasill%20path` | Practice board with that hero-matrix map's pick, ban, protect rates |

## Flows

1. Open `/drafts`. Both tables render when stats and hero totals are present.
2. Pick a map in the filter. The map filter controls **both** tables.
3. Pick an event. **Ignite picks and bans** narrows; **All pro games, last 30 days** stays put, and its caption still says "every region".
4. Resize to 390×844. Both tables may scroll inside their own `overflow-x-auto` box; the page itself must not scroll sideways.
5. Win-rate cells show "—" below 10 games, and the note under the table says it is not a chance of winning.
6. Open `/drafts/simulator`. The hero cards show Pk, B, Pr and W rates from mrvl's Overall group, with "Last 30 days of pro games · {games} games on all maps".
7. Pick a map in the simulator's Map select. The cards switch to that map's group and the label names the map and its games; the format's steps and any moves stay put. Reload: `?map=` keeps the choice. Choose All maps: `?map=` is dropped.
8. A win rate below 10 games shows "—", and the note says win is play time, not a chance of winning.
9. Without hero totals (`hero-matrix:v1` missing), the Map select is disabled with its reason and the cards keep the B and P label from the drafts we have.

## Evidence

- Screenshot `/drafts` at 1440 and 390.
- Screenshot `/drafts?map=<map>` after the filter, showing the new table's caption and rows changed.
- Screenshot with an event filter, showing the new table unchanged and the "every region" caption.
- Read `innerText` for the two table headings, the caption and a known hero row.

Fixtures mode (`PLAYER_DATA_MODE=fixtures`) covers only player data. The esports snapshot and mrvl hero totals still come from their normal sources; a first `/drafts` load may make one mrvl request and may take minutes while the Liquipedia snapshot builds.
