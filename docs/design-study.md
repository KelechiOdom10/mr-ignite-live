# Reference study: a score desk, not a card gallery

Studied on 2026-11-16, alongside Rivals Hub at `68c73173c9d5982085b446371417187f531c0c2f`. These are six products with specific mechanisms to borrow. We are not copying their advertising, tracking, branding or smallest text. The local reference captures and type censuses are retained with MRI-16's handoff.

The direction is **a compact score desk**: a reader finds the next known series, the latest result, or a named player's performance. Teams and scores are the primary content; tournament, round, date and source are secondary context. A draft simulator is the exception: the current decision and selectable heroes take priority over statistics.

## 1. VLR.gg — fixed lanes make a dense series readable

Source: [schedule](https://www.vlr.gg/matches) and [results](https://www.vlr.gg/matches/results), captured in Chrome at 1440×900. The schedule exposes time at the left, two team baselines, a dedicated state/countdown lane, then event context at the right. One date label governs a run of rows; it is not repeated inside each match. A fine separator, not a fresh rounded box, divides neighbouring series.

The first-two-viewport type census found Roboto with 10/11/12/13/16px sizes; 13px/400 with a 1.54 line-height ratio accounted for 25% of sampled schedule characters. That is evidence for concentrating dense text into one reading size, **not** a recommendation to copy 10px text. Borrow its fixed score lane and group rhythm; use our 14/12px reading/metadata pair and keep every existing `MatchCard` link and spoiler treatment.

## 2. HLTV — state and tournament create the scan path

Source: [matches](https://www.hltv.org/matches), captured in Chrome. The visible live block places a literal red `LIVE` label at the left, stacks the two teams beside it, and aligns their scores at the far edge. Event context is a slim line above the pair. Live, recommended and upcoming are separate sections, so time/state decides the reading order before decoration does.

The census includes many sizes below 12px; the first capture also had a consent overlay, which was dismissed for the retained HLTV image. This is not a clean type benchmark. Borrow **state first, teams second, score in a fixed lane**, plus explicit section labels. Do not borrow the squeezed three-column layout, betting material or tiny auxiliary text. Its lesson is grouping, not visual imitation.

## 3. Formula 1 — one table, stable columns, one data size

Source: [2025 race results](https://www.formula1.com/en/results/2025/races), captured in Chrome. Grand Prix, date, winner, car, laps and time occupy stable columns inside one dark result panel. Hairline rows carry the structure. The bold identity marks do not replace text names, and numerical columns remain easy to compare vertically.

In the sampled first two viewports, 16px/600 with 24px line height accounted for 68% of characters; the page title used 32px with a 1.19 ratio. Some initial census content includes the cookie dialog, so treat those shares as a page sample, not a pure table analysis. Borrow the **large jump between title and repeated data**, right-aligned numbers, and one shared container. Keep the site's own Geist and tokens rather than importing F1's display font.

## 4. FotMob — shared competition context buys density

Source: [live scores](https://www.fotmob.com/), captured in Chrome. A competition header is followed by several fixtures within the same panel. Opponents converge around the central time/score lane; the league identity lives above them. A completed/live score and a scheduled time occupy the same visual address, so switching state does not change row anatomy.

The sampled text is concentrated at 14px (400/500, roughly 1.13–1.29 line-height ratios); 14px/500 at 1.21 alone accounts for 25% of characters. Borrow the **shared header and invariant score position**, not its pure-black canvas or newsletter/sidebar furniture. Kelechi's no-pure-black standard wins over the reference.

## 5. Twitch — dense navigation survives with two reading sizes

Source: [Marvel Rivals category](https://www.twitch.tv/directory/category/marvel-rivals), captured in Chrome. The left rail pairs a channel name with a quieter game label; a red dot and viewer count occupy a separate right lane. In the main area, one clear game identity sits above content tabs, filters and media. Purple selects an action/tab, while red means live; neither is a general-purpose decoration colour.

The post-consent sample used 12/14/18/24px; 14px regular text at a 1.4 line-height ratio accounts for 25% of characters and 12px regular at 1.4 for 41%. Borrow the **14px identity / 12px secondary rhythm**, explicit live signal and clear separation of navigation from content. Do not borrow sign-up banners, ads or the number of competing controls.

## 6. X's NBA hub — state changes in place

Source: Mobbin's [X NBA schedule](https://mobbin.com/screens/c01d3d84-80d9-457d-8142-3dc3cac027c8). I inspected the returned image. Live rows stack two teams with small identity marks, place period/clock next to two right-aligned scores, and use horizontal separators. Upcoming rows preserve the team structure but exchange the score/clock area for tip-off time. Schedule/Standings/Stats and the date strip each have one selected position.

Borrow **the same row in live, upcoming and final states**, with the status readable as text and with a reserved score/time lane. The related [X NBA game detail](https://mobbin.com/screens/c6f41164-e395-47af-af4d-3f70de48fa58), downloaded and inspected, also puts the score and period above a compact period-by-period table. The images alone do not establish exact CSS sizes; no pixel scale was inferred from Mobbin's resized previews. These are anatomy references, not sources of invented spacing tokens.

## The local bar these references support

The references support alignment, shared group context, a small number of repeated type roles and state-specific colour. They do not agree on fonts, spacing values or accessibility. Our chosen numbers are 4/8/12/16/24/32/48/64px for layout, 14/20px for repeated reading text, 12/16px for metadata, 18/24px for section headings and 24/32px for page titles. Use 32/40px for a result hero, not for every card.

Kelechi's `frontend-design-direction` supplies hierarchy before decoration and reuse of the existing system. His frontend standard and `frontend-quality` supply semantic tokens, one accent on neutrals, meaningful states, non-colour meaning, phone support, focus and reduced motion. His `ui-sweep` supplies evidence provenance and the rule that a screenshot must be opened, not merely generated. This study adds the sport-specific row anatomy and the local thresholds; it does not replace those skills or prescribe a new state-management stack.

The Product Design plugin is installed, but its `audit` skill was not exposed as a readable skill or callable tool in this run. The critique is a direct, read-only review of our harness PNGs with numeric checks, not a claim to have run that plugin. Mobbin was reachable and supplied the X reference; most searches returned streaming/marketing surfaces, which were rejected as density benchmarks.
