---
name: verify
description: Prove Rivals Hub works end to end - start it in isolation on recorded RivalsTracker fixtures (no upstream requests), drive its esports and player flows in a real browser, and capture evidence. Use before calling a change done, or to run, reproduce, or demo Rivals Hub.
---

# Verify Rivals Hub

Everything here makes **zero upstream requests**: the dev server replays `test/fixtures/rivalstracker/` unless `.env` says `PLAYER_DATA_MODE=live`. Never set live mode to verify; recorded players are enough.

## Launch

Run from the checkout you are verifying (a worktree is best: see Isolation).

```sh
bun install --frozen-lockfile        # first run in a new checkout or worktree
bunx void prepare                    # generates .void/ types; typecheck fails without them
bunx void db migrate                 # local D1 tables for favourites
PLAYER_DATA_MODE=fixtures bun scripts/dev.ts --port 5191 --strictPort > /tmp/rivals-hub-verify.log 2>&1 &
```

Ready when `/tmp/rivals-hub-verify.log` prints `Local: http://localhost:5191/` and `curl -s localhost:5191/api/credits` answers `{"mode":"fixtures",...}`.

The first page load builds the esports snapshot from Liquipedia, paced at one request per 2 seconds. With an empty local KV that can take minutes, and pages hang until it finishes. To skip it, stop the server and copy the main checkout's local KV first. This is a copy, never a move:

```sh
test -d ~/Projects/mr-ignite-live/.void/v3/kv && rm -rf .void/v3/kv && cp -R ~/Projects/mr-ignite-live/.void/v3/kv .void/v3/kv
```

## Doctor

```sh
curl -s localhost:5191/api/credits                                    # mode must be "fixtures"
curl -s -o /dev/null -w "%{http_code} %{time_total}\n" localhost:5191/player/670067075   # 200 in a few seconds
```

`spent` there is simulated. Fixtures mode books one request per recorded response in an in-memory ledger, so the first load of a player raises it (1 for Sypeh, 1 for TrqstMe, plus 1 if the leaderboard is opened), and a restart resets it. Nothing reaches RivalsTracker while `mode` is `fixtures`.

If `mode` is `live`, stop: something set `PLAYER_DATA_MODE=live` and any player page may make a real request. If the player page hangs, the snapshot is still building (see Launch).

## Isolation

- Port **5191**, not 5180: the main checkout's `bun run dev` owns 5180 (`--strictPort`).
- KV, D1 and caches live in the checkout's own `.void/v3/` (git-ignored), so a worktree never touches the main checkout's data.
- Fixtures mode uses an in-memory player cache and credit ledger (`src/players.ts`), so the real D1 cache and ledger are untouched.

## Sign in

None. The site is local-only and has no accounts.

## Drive

Use Synara's in-app browser (`browser_*` tools): `browser_open`, then `browser_resize` to 1440×900 and later 390×844. Assert text with `browser_run` reading `innerText`. Server HTML from curl splits strings with React comment nodes (`season (<!-- -->10.5`), so plain text matching on it fails. Without a browser tool, strip comments and tags first (`sed -E 's/<!-- -->//g; s/<[^>]+>/ /g'`) and say the proof is server-render only.

| Handle                                                                               | Where                                                              |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `/player/670067075`                                                                  | Sypeh: recorded career, 20 competitive matches, all season 10.5    |
| `/player/1364513129`                                                                 | NAVI TrqstMe: recorded career, **private** match history           |
| `/players`, `/players?name=Sypeh`                                                    | Search and favourites; the `name` query prefills without searching |
| `/leaderboard`                                                                       | Recorded top 100 (PC)                                              |
| `/game/5513337_1791844040_1311009_11001_12`                                          | The one recorded ranked match                                      |
| `/`, `/events`, `/match/<id>`                                                        | Esports pages from the live Liquipedia snapshot                    |
| `/drafts`                                                                            | Both draft tables, map and event filters                           |
| ⌘K (`role=combobox`, placeholder "Search teams, matches, events, players and pages") | Global search                                                      |

Searching any name other than `Sypeh`, `NAVI TrqstMe` or `zzqxnoplayer77` in fixtures mode answers "No player is named …", as the API does for an unknown name.

The palette input is controlled. Click it first, then type with `human.type`; typing straight after ⌘K races its open animation and drops keys.

## Evidence

Drive the real user path, not internal helpers. Capture the action and the resulting state. Before each screenshot, wait about a second for entrance animations. Save proof with `browser_screenshot({kind:"proof"})` and keep the returned paths; they survive cleanup. Also check `/api/credits` still says `mode: fixtures`; don't assert `spent: 0` (see Doctor). If `browser_screenshot` returns `BrowserMalformedResponse`, wait a second and retry once. If it fails again, record the `innerText` read as evidence and say the screenshot failed.

## Cleanup

```sh
lsof -nP -iTCP:5191 -sTCP:LISTEN -t | xargs kill
```

Leave `.void/` (git-ignored) and the screenshots.

## Gotchas

- `bun run check` is format, lint (warnings fail), boundaries, typecheck and tests. Run it before every commit; it needs `.void/` from `bunx void prepare`.
- If your clone excludes `.claude/` (for example in `.git/info/exclude`), `oxfmt .` skips these skill files locally but CI checks them. After editing them, run `bunx oxfmt .claude/skills/verify/SKILL.md .claude/skills/verify/features/*.md`.
- Don't edit `src/components/` or `src/lib/` (vendored beUI).
- Restart the dev server after switching to a branch that adds or removes pages. Vite keeps the old route table and answers 404, and an open tab may need a full reload.
- Cron triggers don't fire under Vite. The esports snapshot syncs on read at most once a minute.
- Dates in fixtures are fixed (recorded 2026-10-17), so "N days ago" grows over time; assert on seasons and counts, not relative dates.

## Features

`features/README.md` lists every mapped flow.
