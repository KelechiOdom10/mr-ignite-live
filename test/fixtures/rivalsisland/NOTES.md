# RivalsIsland fixtures

Raw responses from https://api.rivalsisland.com (OpenAPI 2.1.0), recorded 2026-10-17 with a free-tier key. Each `.json` body sits beside the `.headers` of the same response (`heroes` was recorded without headers). Copied byte-for-byte from the original recording; never hand-edit, re-record with `scripts/record-rivalsisland.ts` instead.

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

The original match-history recording is not here: its body (a 200 for uid 670067075) and headers (a 403) came from different requests, so it is re-recorded instead.

## Vendor quirks

- Every response carries `x-credit-balance` and `x-credit-cost`. Failed requests cost 0.
- Match history is private for many players: `403 {"code":"match_history_private"}`. Careers can be private too (`career_private`).
- `/players/{uid}/career` embeds the full profile, so the profile endpoint isn't needed.
- Hero career `matches` and `wins` are fractional (for example `7.5014`).
- History rows have result, score, K/D/A and MVP/SVP but no hero; heroes come from `/matches/{match_uid}`.
- Hero names are uppercase (`BRUCE BANNER`); icons are absolute URLs on `assets.rivalsisland.com`.
- Player names can contain Cyrillic homoglyphs; identity is the uid.
- Responses can gain fields at any time; schemas strip unknown keys.
