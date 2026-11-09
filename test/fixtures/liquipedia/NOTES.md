# Liquipedia fixtures

Raw responses recorded from `https://liquipedia.net/marvelrivals/api.php` on 2026-10-16 (during Ignite 2026 Stage 2 playoffs). Never hand-edit them; re-record instead.

| File | Request |
| --- | --- |
| `contents-stage2.json` | `action=query&prop=revisions&rvprop=content&rvslots=main` for Stage 2 Americas, Americas/Group Stage, Pacific/Asia |
| `americas-finished.json` | The same request for Stage 2 Americas once its playoffs finished, recorded 2026-11-09: a `{{TeamPrizePool}}` with no opponents and the final bracket |
| `revisions.json` | `action=query&prop=revisions&rvprop=ids\|timestamp` for Americas, EMEA and a missing page |
| `teamshort.json` | `action=expandtemplates` of `{{TeamShort|…}}` for a known team, an unknown team and an allmode-only logo team |
| `api-error.json` | an unknown `action`, which returns a top-level `error` object |

## Vendor quirks

- Match times carry the caster's zone as a template: `2026-10-16 - 06:00 {{Abbr/AEST}}`.
- A bracket's `|id=` value can be followed by a round comment (`<!-- Upper Bracket Quarterfinals -->`) before the next `|`.
- Unplayed maps are present with empty params: `{{Map|map=|score1=|score2=|winner=}}`.
- Missing pages come back with `missing: true` and no `revisions`.
- Unknown teams expand to `<small class="error">Missing template for team=…</small>`.
- Some teams only have an `allmode` logo, no `darkmode`/`lightmode` pair.
- Liquipedia rejects image hotlinks from other origins (HTTP 403), so logos are proxied.
