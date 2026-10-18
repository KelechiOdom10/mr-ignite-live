# Shell and navigation

**What it is.** The header (nav, live island, search, spoiler toggle), the esports fixture strip, the footer and the mobile bottom nav.

## How to reach it

Every page.

## How to drive it

1. Open `/`, `/drafts`, `/player/670067075` and `/review` at 1440, then at 390. Also check 1024 for header fit.

## What proves it works

- The nav lists Matches, Events, Drafts, Players and Review. `scripts/routes.test.ts` fails if any nav or Go to link has no page. The current section's item has `aria-current="page"`: `/match/…` → Matches, `/event/…` → Events, `/drafts/simulator` → Drafts, `/game/…` and `/leaderboard` → Players.
- Nav labels, the Search label and the full "Hide spoilers" label show from 1280 (`xl`). Below that, items are icons with screen-reader labels and a hover title, and the header stays on one line at 1024 even with the live island showing. The island shows from 1024 (`lg`); below that, live games are in the fixture strip on esports pages.
- `/`, `/events`, `/drafts`: the fixture strip of live and upcoming chips shows under the header. The footer shows "Live updates on · Liquipedia updated …", and `/drafts` credits "Draft data from mrvl.net".
- `/player/…`, `/players`, `/leaderboard`, `/game/…`, `/review`: no fixture strip, but the live island still shows when a match is live, and the footer keeps the live status.
  - Player pages credit "Player data from RivalsIsland; live scores from Liquipedia…".
  - `/review` reads "Recordings and notes stay in this browser…".
- The fixture strip's first chip lines up with the logo, and only edges with chips scrolled out of view fade. The Matches page's segmented controls have a hairline inset ring and concentric corners (12px outside, 8px pill, 4px padding).
- At 390 the bottom nav shows the five sections with the current one highlighted. The Hide spoilers switch sits in the header. Nothing overflows horizontally.

## Owning code

`src/ui/AppShell.tsx`, `src/ui/sections.ts` (`sectionOf`, `showsFixtureStrip`).
