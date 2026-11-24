# Changelog

Newest first. One line per change: the outcome first, then the PR.

## Unreleased

- **Nightcrawler shows up properly:** named and pictured in match stats, drafts and the simulator, and any future new hero reads "New hero" instead of "Hero 1068" (#78).
- **Home shows the group standings while a group stage runs:** beside Events on a laptop, under Live now on a phone (#75).
- **The Grand Finals page opens on the group standings:** live series first, both tables beside today's matches, and Through or Out once it is certain (#74).
- **INTL is back on international events:** on cards, chips and event rows, and group matches show their group (Group A, Group B) in its place (#74).
- **Grand Finals matches sit under their real day:** nothing played today says "Date to be confirmed" (#72).
- **Copy reads plainly:** stats notes, source panels and error messages drop internal wording such as "cached" and "budget" (#69).
- **A slow Cloudflare status no longer fails the deploy:** it waits for traffic to catch up instead (#70).
- **A slow traffic read no longer crashes the deploy:** it retries instead (#68).
- **Events lists only real events:** the Grand Finals tabs, the series page and a page marked for deletion no longer appear as events (#61).
- **Phone taps land more reliably:** the logo, Search, spoiler switch and See all have 44px touch areas (#63).
- **Drafts says what is missing, in plain words:** a one-line note instead of a boxed "No cached maps" (#65).
- **Draft simulator shows heroes on the first phone screen:** setup folds into one row and the teams into a compact summary (#66).
- **Find an event by typing:** the Results event list has a search box and a scrollable list (#64).
- **Upcoming lists known matchups first:** series with both teams come before the empty bracket slots (#62).
- **Results come first on phones:** filters sit behind a Filters button, with active ones as chips (#60).
- **Home shows what is next:** the Events sidebar lists the next dated event when nothing is ongoing, and undated pages no longer fill it (#59).
- **Results no longer disappear after 30 days:** home and the archive retain history (#57).
- **Red deploys stop lying:** a deploy that published correctly no longer reports `deployment-changed` (#58).
- **Failed deploys keep safe evidence:** allowlisted traffic and trigger reads, kept for seven days (#58).
- **Design reviews have rendered evidence:** screenshot and measurement harnesses (#55).
- **Draft simulator maps are visual:** art tiles with a mobile picker sheet (#54).
- **Matches filters:** the Team filter lists each team once, with its logo, instead of once per spelling (#53).
- **The tab shows the site's mark,** /matches stays on Upcoming while a series is unplayed, and the event page names its undated group too (#52).
- **Pushes to main deploy the site** once the checks pass, from GitHub Actions (#51).
- **The site is live on rivalshub.kellycooks.dev,** alongside its workers.dev hostname (#49).
- **Checks pass on a fresh clone:** `bun run check` generates Void's types before it typechecks (#48).

## 2026-11-16

- **Matches page:** Upcoming shows the undated bracket, and filters stay on Results (#45).
- **Matches page:** filter results by event, team and date; home is now a summary (#43).
- **Matches page:** opens on Results when nothing is scheduled, instead of an empty Upcoming (#44).
- **Dev server, build and deploy work on macOS again:** they run Vite and void under Node, found on `PATH` or in nvm (#46).

## 2026-11-09

- **Event pages:** finished events show real prize placings, filled from the bracket (#42).
- **Draft simulator:** pick a map to see each hero's pro rates on it, from mrvl's last 30 days (#41).
- **Event pages:** prize distribution by place, and a participants grid. Placings hide with Hide spoilers (#40).
- **Deploys work again.** They publish first, then check readiness (#38).
- **Draft simulator:** role tabs with icons, and an Ignite/Ranked format switch (#37).
- **/drafts:** new 30-day "All pro games" hero table from mrvl (#36).
- **Player data is back,** now from RivalsTracker (#30).
- **Simulator hero icons load again** (#31).
- **Home:** changing region keeps you on Results, and tabs show focus (#28, #29).
- **Match stats fill in for missed series.** The "Hero 0" ban is gone (#27).
- Internal: Void upgrade and deploy fixes (#32, #33), comment clean-up and rules (#34, #35).

## 2026-10-24

- **Rank-first player page is live** (#26).

## 2026-10-21

- **Player page leads with rank,** with rank and platform icons (#25).
- **Fixes:** the live island stays put, tabs survive the back button, plus hover cues and role icons (#24).
- Internal: anti-slop lint rules (#23).

## 2026-10-18

- **Drafts:** explore pro drafts, and practise in the simulator (#17, #22).
- **Match pages:** every hero played, broken down per hero (#20). Map-name mismatches are flagged (#15).
- **Nav and search:** Drafts, Review and players added (#14, #18).
- **Players:** season summary, with seasons marked in history (#13).
- **Review:** watch your own match recordings on your machine (#12).
- **Phones:** match strip aligned, no sideways scroll (#19).
- Internal: verify skill (#16).

## 2026-10-17

- **Players section launched:** search, player pages, the leaderboard, match details and favourites (#3, #4, #6, #7, #8).
- **Requests time out** instead of hanging (#11).
- **Player page fixes** for links, refresh errors and small screens (#9).
- **Rebranded as Rivals Hub** (#2).
- Internal: folder boundaries (#1), recorded test responses (#5).
