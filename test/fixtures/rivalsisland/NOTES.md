# RivalsIsland fixtures

Raw responses from https://api.rivalsisland.com (OpenAPI 2.1.0), recorded 2026-10-17 with a free-tier key. Each `.json` body sits beside the `.headers` of the same response (`heroes` was recorded without headers). Copied byte-for-byte from the original recording; never hand-edit; re-record with `scripts/record-rivalsisland.ts --max-credits <n> name:cost=/path` instead (it reads the key from `.env` and never prints it).

| File | Request | Credits | sha256 |
| --- | --- | --- | --- |
| `heroes.json` | `/heroes` | 1 | `048fdfe1ea3c1ca711788352d37936c4b37bfc763ccc6481b111d5ba8f0ac0d4` |
| `maps.json` | `/maps` | 1 | `7e22ec3790137d77d201a2e2171a611f335ddccd637b5baed3d402a8fdd62ee6` |
| `seasons.json` | `/seasons` | 1 | `5de93d29d250383e53261c24a54b44c9bbca7fd4bc9a9fdd460e2f423d19d4ee` |
| `modes.json` | `/modes` | 1 | `7a1fc8272667d814ee7a2dfa77a942371fda7f45e33b652e2ccf461936601cd1` |
| `team-ups.json` | `/team-ups` | 1 | `6823e7e4447269431edd951fc67b202ac88aaa0cb4eb0ea4cdbe48875cb2d356` |
| `leaderboard.json` | `/leaderboard?limit=10` | 1 | `1fbe74c0af2d451cc08e8469f5b385292b3aeb39719c3baa17c6655a195da50c` |
| `leaderboard-100.json` | `/leaderboard?limit=100` | 1 | `e0c159461e735740e9b23ad10f97161bab4555b03344f4b6cdac1a9ab9625045` |
| `player-search.json` | `/players/search?name=NAVI TrqstMe` | 5 | `9bb943a6feb44d22c81c3e4aafd798727861a9f319f489df932388fc53d91c47` |
| `player-profile.json` | `/players/1364513129` | 5 | `99b32bb520d304e84865828ac608f883c90f15175ec4149adf3ee26db111c387` |
| `player-career.json` | `/players/1364513129/career` | 10 | `713f6b211f96a4a9e76b84cf667012b58ad1c7a911d9392c74a53c3ab374994a` |
| `match-detail.json` | `/matches/5513337_1791844040_1311009_11001_12` | 5 | `aaece681732cf9b28226fe55308367e353ce79c445913ce04b8f623d1a97ae47` |
| `player-hero.json` | `/players/670067075/heroes/1011` | 10 | `a3bb61c286f7db01080a598ce474a4b9daf7491b6211dee98bfddd13ae09ace2` |

Check with `shasum -a 256 test/fixtures/rivalsisland/*.json`.

## Recorded 2026-10-17 with `scripts/record-rivalsisland.ts` (31 credits, balance 9,948 → 9,917)

| File | Request | Credits | sha256 |
| --- | --- | --- | --- |
| `history-private.json` | `/players/1364513129/match-history?page=0&page_size=20&category=2` | 0 (403) | `c013f9685f946e76da37f79f88d9325e419b04896136ab7abdd2a5d4aeb33676` |
| `career-not-found.json` | `/players/1/career` | 0 (404) | `eec91fb4a505f0fccda51fc67ab1ce633078ddf9606357385a9cd98878c1e716` |
| `match-not-found.json` | `/matches/1_1_1_1_1` | 0 (404) | `b6bb3e51ab98df64719f75cf015352431162c2147f89fe385cc395000677c697` |
| `search-miss.json` | `/players/search?name=zzqxnoplayer77` | 5 (200, `player: null`) | `fc2c417b3c2c15e95b15921f884b91656da6138463bb5b93d0906c50fe566939` |
| `search-sypeh.json` | `/players/search?name=Sypeh` | 5 | `0d65c987b9b2432e818cb84eaeb2fc30a0736335452596c95e21b2e75e8cb1a6` |
| `career-sypeh.json` | `/players/670067075/career` | 10 | `adddacffd62527e4a72f99b78434dc658e7acb5ea972002ea54cc957ff046886` |
| `history-sypeh.json` | `/players/670067075/match-history?page=0&page_size=20&category=2` | 10 | `0902bb27d5d0e8f30d34a37f1f203bd423f88a4d34d8b4d32b36a2b08c7af81c` |
| `leaderboard-pc.json` | `/leaderboard?device_type=pc&limit=100` | 1 | `43eee12c30e3ede2fa18f2305e4e33b79ae8e84f6794af83abc9ca01adfac862` |

Sypeh's newest Competitive match in `history-sypeh.json` is the match already recorded in `match-detail.json`.

The original match-history recording is not here: its body (a 200 for uid 670067075) and headers (a 403) came from different requests, so it was re-recorded as `history-sypeh` above.

## Vendor quirks

- Every response carries `x-credit-balance` and `x-credit-cost`. Failed requests cost 0, but a search that finds nobody is a 200 with `player: null` and costs 5.
- Match history is private for many players: `403 {"code":"match_history_private"}`. Careers can be private too (`career_private`).
- `/players/{uid}/career` embeds the full profile, so the profile endpoint isn't needed.
- Hero career `matches` and `wins` are fractional (for example `7.5014`).
- History rows have result, score, K/D/A and MVP/SVP but no hero; heroes come from `/matches/{match_uid}`.
- Hero names are uppercase (`BRUCE BANNER`); icons are absolute URLs on `assets.rivalsisland.com`.
- Player names can contain Cyrillic homoglyphs; identity is the uid.
- Responses can gain fields at any time; schemas strip unknown keys.
