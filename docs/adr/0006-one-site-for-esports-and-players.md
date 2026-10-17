# 6. One site for esports and players

## Context

A personal rivalsdata.com-style player section (RivalsIsland API) was planned as a second app in a bun-workspaces monorepo beside Ignite Live. Both are local-only. The monorepo needed per-app Void roots, vendored beUI aliases across packages and Tailwind scanning across packages before any player feature, and those were the riskiest steps for the existing app.

## Decision

Build one Void site, Rivals Hub. The esports pages keep their routes; the players section adds `/players`, `/player/:uid`, `/game/:matchUid` and `/leaderboard` under the same header. Each upstream source keeps its own folder (`src/liquipedia`, `src/mrvl`, `src/rivalsisland`) and maps into `src/domain`; sources never import each other. `scripts/boundaries.ts` enforces the folder table in `check`.

## Consequences

- One dev server, one stylesheet, one image proxy; no package or alias plumbing.
- A future player source (for example marvelrivalsapi) is a new `src/<source>/` folder, not a new app.
- The players section spends paid credits, so it must be locked (local-only flag or auth) before the site is ever deployed publicly.
