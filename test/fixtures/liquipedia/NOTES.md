# Liquipedia fixtures

Raw responses recorded from `https://liquipedia.net/marvelrivals/api.php` on 2026-10-16 (during Ignite 2026 Stage 2 playoffs). Never hand-edit them; re-record instead.

| File | Request |
| --- | --- |
| `contents-stage2.json` | `action=query&prop=revisions&rvprop=content&rvslots=main` for Stage 2 Americas, Americas/Group Stage, Pacific/Asia |
| `americas-finished.json` | The same request for Stage 2 Americas once its playoffs finished, recorded 2026-11-09: a `{{TeamPrizePool}}` with no opponents and the final bracket |
| `contents-grand-finals.json` | `action=query&prop=revisions&rvprop=content\|timestamp&rvslots=main` for the Ignite 2026 series page, Mid-Season Qualifiers/Oceania (a page marked `{{deletion}}`), Grand Finals/Additional Data and Grand Finals/Qualification, recorded 2026-11-19: none has an `Infobox league` or a match |
| `grand-finals-matches.json` | `action=query&format=json&formatversion=2&prop=revisions&rvprop=content\|timestamp&rvslots=main` for Grand Finals and Grand Finals/Group Stage, recorded 2026-11-23 on day 1 (30 group matches, the 14-match playoff bracket) |
| `revisions.json` | `action=query&prop=revisions&rvprop=ids\|timestamp` for Americas, EMEA and a missing page |
| `teamshort.json` | `action=expandtemplates` of `{{TeamShort|…}}` for a known team, an unknown team and an allmode-only logo team |
| `api-error.json` | an unknown `action`, which returns a top-level `error` object |

## Vendor quirks

- Match times carry the caster's zone as a template: `2026-10-16 - 06:00 {{Abbr/AEST}}`.
- Grand Finals writes match times as a long date, `November 23, 2026 - 14:00 {{Abbr/CET}}`, where the Stage 2 pages use ISO. Group matches there say `bestof3=3` instead of `bestof=3`.
- A bracket's `|id=` value can be followed by a round comment (`<!-- Upper Bracket Quarterfinals -->`) before the next `|`.
- Unplayed maps are present with empty params: `{{Map|map=|score1=|score2=|winner=}}`.
- Missing pages come back with `missing: true` and no `revisions`.
- Unknown teams expand to `<small class="error">Missing template for team=…</small>`.
- Some teams only have an `allmode` logo, no `darkmode`/`lightmode` pair.
- Liquipedia rejects image hotlinks from other origins (HTTP 403), so logos are proxied.
