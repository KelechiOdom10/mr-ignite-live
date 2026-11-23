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

## Group standings (`src/domain/standings.ts`)

- Liquipedia's `{{GroupStandings}}` holds no results, only the teams, the match lists (`matchgroups`) and the cutoff (`bg=1-4=up`), so the table is computed from the matches already in the snapshot. A match belongs to a group when its id starts with one of the group's match list ids.
- Only finished series count; a series in progress marks both teams as live and changes nothing until it ends.
- Order follows the template's tiebreakers: series wins, series losses, head-to-head series wins among the teams level on both, then map difference. Teams level on all four share a place.
- **Through** or **out** is set only when no combination of the remaining series can change it; a tie at the cutoff counts against the team, so early in the stage nobody is marked.

## Scope (`src/domain/scope.ts`)

- Home and the matches archive receive all available events and matches, including on live refresh. Age does not remove results; only an explicit date filter limits them. Home renders a bounded summary, and the unfiltered Results list initially shows 36 series.
- Event and match detail scopes include recent events, live matches and the requested event; match detail also keeps both teams' older matches for form and head-to-head.
- The events list keeps every event with near-term matches and their playoff dependencies for spoiler masking.
