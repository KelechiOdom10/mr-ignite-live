# Domain

| Term            | Meaning                                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Event           | One Liquipedia tournament page, e.g. `MR Ignite/2026/Stage 2/Americas`. Its `/Group Stage` subpage belongs to the same event. |
| Match           | A series (Bo3/Bo5/Bo7) between two teams. Id is `<bracket or matchlist id>_<slot>`, e.g. `kOKqgtPHq4_R2M2`.                   |
| Map             | One game in a series, with its own score and winner.                                                                          |
| Stored snapshot | What KV holds: parsed pages keyed by title with their revision ids, plus team info.                                           |
| Snapshot        | What pages and `/api/snapshot` serve: flattened events and matches, scoped and stamped with `servedAt`.                       |

## Match status (`src/domain/matchState.ts`)

- **Finished** when one side has won `ceil(bestOf / 2)` maps, Liquipedia marks it finished or walkover, or it started more than 6 hours ago with both teams known (abandoned or never completed on the wiki).
- **Live** when both teams are known and either a map has a winner or the start time has passed.
- **Upcoming** otherwise, including any match with a TBD side.
- `finishedBy` records why: a series Liquipedia marks finished with no maps reads **Walkover** and one closed by the 6-hour rule reads **No result** (both show "Final" while Hide spoilers is on).

## Scope (`src/domain/scope.ts`)

- The home page gets events that ended in the last 30 days, plus any live match.
- An event page gets only that event's matches.
