# Changelog

What changed on Rivals Hub, newest first, in plain words. Each PR adds its line under **Unreleased**. When the change is deployed, that line moves under the deploy date. Internal-only changes (tests, lint, docs) are grouped at the end of each day.

## Unreleased

## 2026-11-09

- Deploys publish straight to live and check readiness afterwards. They had stopped working because Cloudflare was slow to route the check (#38).
- Draft simulator: role tabs with the role icons, and a switch between the Ignite 2026 and Ranked formats. The format stays in the link (#37).
- `/drafts` has a second table, "All pro games mrvl tracked", with the last 30 days of pick, ban, protect and win rates for every hero. It follows the map filter (#36).
- Player data is back. RivalsIsland shut down, so players, the leaderboard and match pages now use RivalsTracker, with their OK (#30).
- Draft simulator hero icons load again. They had pointed at RivalsIsland's dead image host (#31).
- Home page: switching region keeps you on Results or Upcoming, and the region and map tabs show a visible focus ring (#28, #29).
- Match stats fill in for series the sync missed, within mrvl's and Cloudflare's limits. A placeholder "Hero 0" ban no longer appears (#27).
- Internal: upgraded Void and fixed deploying after a secret change (#32, #33). RivalsTracker failures are now logged (#32). Narrating comments were removed, and a no-comments pass is now required before PRs (#34, #35).

## 2026-10-24

- The rank-first player page from #25 went live (#26).

## 2026-10-21

- Player page leads with rank, plus rank and platform icons (#25).
- The live island stays put, tabs survive the back button, hover cues and role icons were added (#24).
- Internal: adopted the anti-slop lint rules (#23).

## 2026-10-18

- Drafts: explore pro drafts, and practise on a draft-board simulator for the Ignite 2026 draft (#17, #22).
- Match pages show every hero each player played, with a per-hero breakdown (#20).
- Match pages show map names where Liquipedia and mrvl disagree (#15).
- Drafts and Review are in the nav and global search, and player search is connected to global search (#14, #18).
- Players: season summary scoped to the season, with seasons marked in match history (#13).
- Review: review your own match recordings on your machine (#12).
- Fixed the match strip alignment and sideways scroll on phones (#19).
- Internal: added the verify skill (#16).

## 2026-10-17

- Players section: search players, a player page, the leaderboard, match details and hero stats on demand, and saved favourites (#3, #6, #7, #8). All of it was RivalsIsland data behind a credit budget (#4).
- Liquipedia and mrvl requests time out instead of hanging (#11).
- Fixed paid links, refresh errors and small screens on player pages (#9).
- Rebranded the site as Rivals Hub (#2).
- Internal: folder boundaries enforced in `check` (#1). Recorded RivalsIsland test responses (#5).
