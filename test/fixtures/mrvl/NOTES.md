# mrvl fixtures

Raw responses from mrvl.net's public Convex backend (`POST https://bold-walrus-4.convex.cloud/api/query`), recorded 2026-10-16. Never hand-edit; re-record instead.

| File | Query |
| --- | --- |
| `recent.json` | `matches:listSummary {"status":"recent","limit":20}` |
| `live.json` | `matches:listSummary {"status":"live","limit":20}` (TLC vs SWAMP live, mrvl 2–0 while Liquipedia showed 1–0) |
| `page-fly-100t.json` | `matches:getPageData` for FlyQuest vs 100 Thieves, Ignite 2026 Stage 2 Americas UB semifinal |

## Vendor quirks

- Responses are a Convex envelope: `{ "status": "success", "value": … }`.
- Scoreboard teams are not in a fixed order per game; align them by name (`linkedTeamName`, `name`, `shortName`).
- Unplayed games are present with no `scoreboard`.
- A series can drop back to `status: "upcoming"` (and out of the `recent` list) for a while after it ends, so linking searches the live, recent and upcoming lists.
- Each team's `bans` list holds both sides' bans; `teamCamp` says whose ban it is.
- Team names differ from Liquipedia ("SWAMP" vs "Swamp Gaming", "NRG" vs "NRG Shock"), so matching uses name variants plus the scheduled time.
- Hero `portraitUrl` paths are relative to mrvl.net; we don't hotlink them.
