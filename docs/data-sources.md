# Data sources and reuse

Rivals Hub is an independent, non-commercial fan project. Access to a public endpoint is not a blanket grant to redistribute its responses, images or the underlying game content.

## Liquipedia

Tournament schedules, brackets and results come from the [Marvel Rivals wiki](https://liquipedia.net/marvelrivals/). Recorded API responses are in `test/fixtures/liquipedia/`; their [recording notes](../test/fixtures/liquipedia/NOTES.md) identify the requests and dates. They are unmodified recordings, not original application code.

Liquipedia's [copyright policy](https://liquipedia.net/commons/Liquipedia:Copyrights) licenses text under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), with attribution and share-alike requirements. Credit Liquipedia and the source articles when reusing that content. Images may have separate terms on their file pages; don't assume the text license covers team logos, event marks or artwork.

API requests use an identifying User-Agent and gzip, are spaced at least two seconds apart, and refetch only changed revisions. See [the sync reference](architecture.md#how-it-stays-live) and [ADR 5](adr/0005-per-run-liquipedia-budget.md) for the per-run budget.

## mrvl.net

[mrvl.net](https://www.mrvl.net) supplies pro match statistics, draft order, hero/map art and early map results. Liquipedia's map results take precedence. Recorded responses and query provenance are documented in [`test/fixtures/mrvl/NOTES.md`](../test/fixtures/mrvl/NOTES.md).

The endpoint being public does not establish redistribution permission. Confirm the provider's terms or obtain permission before republishing its recordings or artwork. Requests are capped and mrvl failures must not break the tournament sync; see [ADR 4](adr/0004-mrvl-for-player-stats.md) and [ADR 10](adr/0010-mrvl-hero-matrix.md).

## RivalsTracker

[RivalsTracker](https://rivalstracker.com) relays game profiles, match history and leaderboard data. Its operator has permitted this site's use, as recorded in [ADR 9](adr/0009-rivalstracker-for-player-data.md); that is not documented permission to redistribute a fixture dataset or sublicense the game data. It publishes no reuse terms or supported developer API contract.

The [recording notes](../test/fixtures/rivalstracker/NOTES.md) document the raw JSON and response headers in `test/fixtures/rivalstracker/`. These include real player identifiers, display names and gameplay records, not synthetic people. Don't treat public profiles as anonymous data. Private histories remain unavailable; do not attempt to bypass visibility settings. Historical commits also contain recordings from the previous RivalsIsland integration, described in [ADR 8](adr/0008-rivalsisland-for-player-data.md).

Development defaults to recorded fixtures. Live requests happen only on reader visits, through the cache and daily request budget (default 300), with at most two concurrent requests per isolate and a ten-second timeout. `PLAYER_DATA_MODE=off` is the kill switch. Provider permission for this deployment doesn't automatically extend to forks.

## Code, assets and trademarks

The application's eventual code license must exclude third-party data, artwork and trademarks. Game rank images in `public/ranks/`, hero/map catalogues, remote artwork, team logos and screenshots containing them need their own rights assessment; a code license does not grant those rights.

Copied free beUI components and the vendored anti-slop lint rules retain their upstream MIT terms in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md). The nested eslint-stylistic code retains its [own notice](../tools/oxlint/anti-slop/vendor/eslint-stylistic/LICENSE). Package dependencies retain their individual licenses.
