# Thirteen small PRs that would make this feel designed

The largest gap is **reading order and grouping**, not a missing font or a fancier accent. The desktop has a recognisable, restrained shell and the match detail has a real score hierarchy. But on a phone, Results shows filters and an upcoming fixture before any result, and the simulator shows its setup board before any selectable hero. Those are task failures, not matters of taste.

## Evidence and scope

Read-only review of the real application at source `68c73173c9d5982085b446371417187f531c0c2f`, captured on 2026-11-16 with Chrome/CDP, 1440×900 and 390×844 viewports, normal motion, `PLAYER_DATA_MODE=fixtures`, copied local KV. The esports snapshot is cached upstream data, not a deterministic sporting fixture. Sypeh is a recorded player. The screenshots below were opened during this session; numbers support, rather than replace, that inspection.

PNG links open the retained [MRI-16 catalog](drive://captain-rivals/renders/MRI-16/catalog.md). The repository's `.shots/` remains ignored. The [reference study](design-study.md) explains the chosen mechanisms. The numeric audit is a local proposed bar, not a claim that every existing failure is an accessibility defect.

The completed numeric baseline covers 28 surface/viewport pairs. None has page-wide horizontal overflow; the desktop Results fold contains five main-content series, excluding the score strip. A representative main-content match card already passes the two-size/four-rank type census, so adding more font sizes is not the fix. The 11.2px shell metadata makes the arbitrary-size rule fail across all surfaces. These repeated shell debts should be fixed once, not filed as 28 separate page bugs. Contrast and focus findings remain targeted review leads, not a declaration that this is a complete accessibility audit.

Impact is 1–5 (5 directly blocks the main reading task); effort is 1–5 (1 is a local component/copy change, 3 is a bounded interaction/layout change, 5 is cross-system). The order puts task-blocking phone issues first, then uses impact ÷ effort to surface cheap wins; the ratio is guidance, not a mechanical sort. Each proposal is one independently reviewable PR; none is implemented here.

## Ranked proposals

| #   | One PR                                                               | Impact | Effort | I/E | Evidence                                                                                             |
| --- | -------------------------------------------------------------------- | ------ | ------ | --- | ---------------------------------------------------------------------------------------------------- |
| 1   | Put results before controls on the phone                             | 5      | 2      | 2.5 | [Results, phone](drive://captain-rivals/renders/MRI-16/matches-results-390x844-fold.png)             |
| 2   | Make simulator heroes reachable in the first viewport                | 5      | 2      | 2.5 | [Simulator, phone](drive://captain-rivals/renders/MRI-16/drafts-simulator-390x844-fold.png)          |
| 3   | Stop presenting empty metrics as three equal summary cards           | 4      | 1      | 4.0 | [Sypeh, desktop](drive://captain-rivals/renders/MRI-16/player-1440x900-fold.png)                     |
| 4   | Make the home event sidebar useful when Ongoing is empty             | 3      | 1      | 3.0 | [Home, desktop](drive://captain-rivals/renders/MRI-16/home-1440x900-fold.png)                        |
| 5   | Put known opponents ahead of unknown bracket placeholders            | 4      | 2      | 2.0 | [Upcoming, desktop](drive://captain-rivals/renders/MRI-16/matches-upcoming-1440x900-fold.png)        |
| 6   | Keep source utility pages out of the main event grid                 | 4      | 2      | 2.0 | [Events, phone](drive://captain-rivals/renders/MRI-16/events-390x844-fold.png)                       |
| 7   | Give standalone actions real touch areas                             | 4      | 2      | 2.0 | [Home, phone](drive://captain-rivals/renders/MRI-16/home-390x844-fold.png)                           |
| 8   | Make the match list a group of aligned rows, not repeated boxes      | 5      | 3      | 1.7 | [Results, desktop](drive://captain-rivals/renders/MRI-16/matches-results-1440x900-fold.png)          |
| 9   | Bound and search the long result choosers                            | 4      | 3      | 1.3 | [Open event chooser](drive://captain-rivals/renders/MRI-16/matches-results-filter-1440x900-fold.png) |
| 10  | Distinguish an empty local draft subset from the populated pro table | 3      | 2      | 1.5 | [Drafts, desktop](drive://captain-rivals/renders/MRI-16/drafts-1440x900-fold.png)                    |
| 11  | Make the phone draft table's main comparison visible                 | 3      | 2      | 1.5 | [Drafts, phone](drive://captain-rivals/renders/MRI-16/drafts-390x844-fold.png)                       |
| 12  | Give VODs one home on match details                                  | 3      | 2      | 1.5 | [Match, desktop](drive://captain-rivals/renders/MRI-16/match-1440x900-fold.png)                      |
| 13  | Consolidate the small-text roles and stop colouring every region     | 3      | 2      | 1.5 | [Home, desktop](drive://captain-rivals/renders/MRI-16/home-1440x900-fold.png)                        |

### 1. Results must show a result

At 390×844, the entire first screen is the shell, title, two tab rows, three vertically stacked filters and a FLY–NAVI **Next up** card. The first result's date is only starting to enter beneath them. Make filters a compact disclosure with active chips, and place the results first; move the upcoming promotion after the requested results or remove it from this tab. Acceptance: one actual result above the fixed bottom bar at 390×844, with all filters still operable. This does not require a new match tile.

The same hierarchy is risky in a selected-team view: an unrelated Next up card should not take priority over the requested team. The unfiltered screenshot here proves the space cost; the selected-team example from another PR is a lead, not evidence claimed as ours.

### 2. The simulator hides the action it asks for

The phone fold ends around the Heroes heading, below a long intro, format/map controls, disabled history actions, two empty team boards and the step strip. There is no selectable hero in the initial view. Collapse setup after choosing a format, reduce the empty board into a compact current-pick summary, and keep the current step near the hero list. Acceptance: at least one selectable hero in the first 844px without deleting the current-team/step context.

### 3. Empty metrics should not look like equal evidence

Sypeh's **Impact** card has four dashes, and Combat/Volume contain more absent values. Three equal bordered cards imply equally useful summaries, but one is entirely unavailable. Omit the all-empty group or replace it with one quiet availability note; keep valid KDA, matches and win rate. Do not turn absence into zero. This is a small partial-state presentation PR, not a data-source project.

### 4. The empty home sidebar spends a third of the composition on nothing

The Events sidebar opens on Ongoing, says “No ongoing events,” and leaves the rest of its column blank, while the Events index has a dated Grand Finals. Show the next dated event or a compact “No events live — view upcoming” action instead. Keep the statement of absence, but don't make the reader operate three tabs merely to learn what is next.

### 5. TBD versus TBD is not the next useful series

The Upcoming fold is a wall of near-identical TBD/TBD cards with stage labels; FLY's first identifiable card is only entering at the bottom. Preserve the bracket placeholders, but put a small “Known matchups” group before “Bracket slots awaiting teams,” or collapse the latter. Acceptance: the first known opponent pair is discoverable before a run of anonymous slots. This is ordering/grouping within the current page, not changing match truth.

### 6. “Additional Data” is a source page, not an event peer

The Grand Finals group contains the real event beside “Additional Data” and “Qualification,” with blank identity marks and Dates TBD. On a phone, two utility-looking entries consume much of the first screen. Classify source subpages and tuck non-event utilities under the parent event or remove them from the public index. Qualification may be a real distinct competition: verify its data before excluding it. Acceptance: each visible index row is a recognisable event with meaningful context, not an imported page title.

### 7. The shell's small hit areas need an explicit phone pass

The header logo, small See all action and spoiler switch are visually subordinate, but their hit areas should not be subordinate. The audit identifies 109×24px logo, 37×16px See all and 48×28px switch rectangles on the baseline home page. Expand wrappers/hit areas to 44px while preserving the compact drawing; manually check that neighbouring targets do not overlap. The screenshot proves where the actions sit; the rectangles come from CDP, not guessed icon dimensions.

### 8. Rounded match boxes repeat context instead of organising it

The Results grid gives every series a border, footer divider, event mark, round label and coloured region. A single-series day leaves two empty grid columns; the next day starts another grid. Use VLR/FotMob's shared day/event context and stable team/score lanes with quieter row separators. Extend/reuse `MatchCard` rather than violating the repository's shared-surface and spoiler rules. Acceptance: more actual series in the desktop fold, stable score alignment and no duplicate context within a group. Keep the current score hero on match details; it already has a clear hierarchy.

### 9. Long choosers need bounded narrowing, not a page-length menu

The open Event chooser runs below the fold and wraps long titles into several lines. It becomes a second long page over the first. Give long option sets a search field and a viewport-bounded scroll area; keep short format pickers simple. Team-logo alignment is separate: #53's owner is already working there, so a searchable 100+ team picker is a follow-up candidate, not scope to add to that PR. Acceptance: find an old event/team with a few characters, retain selected context, and close back to a visible focus target.

### 10. Drafts leads with absence even though useful data exists

The primary section says “No cached maps match these filters” under all-default filters, then a populated “All pro games mrvl tracked” table appears below it. The empty message makes the route look broken before explaining the different datasets. Add concise section identity and a relevant recovery action (“View all pro games” or clear active filters), and reduce the empty block when no filter was applied. Don't claim upstream failure or missing data unless that is actually known.

### 11. A horizontally scrollable table still needs a first-screen comparison

On the phone, Hero, Games, Pick and Ban fit; Protect is cut to “Protec…” and Win is off-screen. This is intentional inner scrolling, not page-wide overflow, but it hides the advertised outcome metric. Keep Hero sticky, choose the most useful default metric set (for example Games/Pick/Win) and provide an explicit horizontal-scroll or metric-selection cue. Preserve full data, denominators and keyboard access; do not squeeze every column to unreadable text.

### 12. Match VODs are duplicated before the map content

Match detail puts a full “VODs” button collection above Maps, then another VOD link inside each map card. The sixth button wraps to a new row, spending vertical space on navigation that immediately repeats. Keep one obvious action per played map and a separate full-series VOD only if one exists. Put live stream actions behind the match state. The score itself is already the page's clear focal point; this PR should remove competing navigation, not redesign that hero.

### 13. The smallest roles and region palette create noise without hierarchy

The top strip's region/status roles use 11.2px alongside 12px names/scores; the same region colours then repeat in card footers (blue AMER, orange EMEA, red CN). That is three identity accents before yellow selection or green winner is counted. Consolidate the tiny role to the chosen 12px metadata scale, keep 14px for primary team identity, and use neutral region text where a logo/group heading already conveys identity. The audit's arbitrary-size and hue warnings support the screenshot; they do not prove every coloured label is wrong.

## Already fixed or deliberately not diagnosed

- #52 (`d5fd429`) fixes the default-tab decision for undated series, names the event page's undated group and adds a favicon. Those are not new recommendations here. The explicit Upcoming screenshot already has “Date to be confirmed”; it is not a missing-heading critique.
- #53's team-logo rows are now merged; they are outside this source baseline and are not a new recommendation here. #54's visual map picker belongs to its owner. Recheck affected chooser proposals against current main; do not duplicate their implementations.
- No claim is made about loading/error/private-history flows, real live-score transitions, reduced-motion interaction correctness, hover, screen-reader output or physical-device behaviour. The harness supports a separate reduced-motion capture; a normal PNG does not prove it.
- The first player discovery selected an unrecorded leaderboard UID and returned 404. The final harness deliberately uses recorded Sypeh and captured the real profile; that capture bug is fixed, not reported as a site design defect.
- A reduced-motion menu experiment produced an empty-looking panel despite option nodes existing; normal-motion captures did not. It is a separate interaction lead, not one of the ranked normal-state design claims. Reproduce against current main before opening a fix.

Start with #1 and #2: both make the promised action visible without a broad redesign. The card-grouping work should follow only after agreeing the row anatomy against VLR/FotMob and preserving the match-view contract.
