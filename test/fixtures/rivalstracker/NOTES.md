# RivalsTracker fixtures

Raw responses from `https://api.rivalstracker.com/api`, recorded 2026-11-09 with
`scripts/record-rivalstracker.ts` and UA `RivalsHub/1.0 (personal, non-commercial)`.
Each `.json` body sits beside the `.headers` of the same response. Copied
byte-for-byte; never hand-edit. Re-record with a JSON manifest (see the script).

The recording run used 15 requests to the API; this directory keeps the eight the
code needs. Routes found but not kept (`/player/{uid}/rank-history`, `/heroes/stats`,
`/hero-players/{heroId}`, `/heroes`, `/maps`) are documented in
`rivalstracker-build/MAPPING.md`; the last two 404.

| File | Request | Status | sha256 |
| --- | --- | --- | --- |
| `player-sypeh.json` | `GET /player/670067075` | 200 | `2cd76599ede49e00c558633f96c363f77fba8b2bce51c75e1150c8fa10b7a537` |
| `player-trqstme.json` | `GET /player/1364513129?season=21` | 200 | `1aa93cfd1e4e71fa97971d6da3d151d0858bac3d3b1c5c3f3c5bcfbff566415e` |
| `match-detail.json` | `GET /matches/5513337_1791844040_1311009_11001_12` | 200 | `d9bdeb716ccdab13caf5ee8a001d07e64efe4d7c4c3b68b2edca6d7907715578` |
| `search-sypeh.json` | `POST /find-player {"name":"Sypeh"}` | 200 | `ba9b3cd8e696e061a3e09bce67ca67a73257918983f2496a693c5ec500bf4f91` |
| `search-miss.json` | `POST /find-player {"name":"zzqxnoplayer77"}` | 200 (`[]`) | `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570` |
| `player-not-found.json` | `GET /player/999999999` | 404 (`player not found`) | `211add53e991f829d2c5ca8bffe3744050e5eb2f3ec5ffc3f347f2ca2ce9e2a2` |
| `leaderboard-pc.json` | `GET /leaderboard/data?device=1&season=last` | 200 | `3d382dd93a8670c8d05064a51b0173ad6651af5059f95f53cf3277f104d8d742` |
| `match-not-found.json` | `GET /matches/1_1_1_1_1` | 404 (empty body) | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

Check with `shasum -a 256 test/fixtures/rivalstracker/*.json`.

## Notes

- Sypeh's `match_history[0]` is the recorded `match-detail` match (`5513337_...`).
- `player-trqstme.json` has `visibility.match_history: false` and an empty
  `match_history`: the recorded private-history case.
- `player-not-found` answers `text/html` with the words `player not found`, not JSON.
  `match-not-found` answers a 404 with an empty body.
- A missing `season` query means the current season; `?season=last` is **not** the
  same thing (it returned an empty `match_history`), so the client omits the param.
- `match_history` holds 20 rows. There is no page or category parameter.
- `match-detail` has no map, season or team score; `dynamic_fields.ban_pick_info`
  is bans only for this match.
- `leaderboard-pc.json` holds 500 ordered rows and echoes `season: "last"`.
- Player and match ids are numeric in some payloads (`_id`, `player_uid`) and strings
  in others (`aid`, `uid`); the schemas accept both and the mappers normalise.
- `rank_game_season` values are JSON-encoded strings, not objects.
