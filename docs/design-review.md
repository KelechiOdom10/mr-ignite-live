# Review the pixels

A clean diff and green checks do not prove a design. Choose the reference mechanism, capture the real page, inspect it beside the reference, then use the numeric audit to catch objective regressions. Neither tool changes application code or belongs in `check`.

## Run

Use the repository's [verify recipe](../.claude/skills/verify/SKILL.md): install dependencies, copy the warm KV (never move it), run a dev server with `PLAYER_DATA_MODE=fixtures`, and confirm `/api/credits` says `fixtures`. Esports data comes from that checkout's cached Liquipedia snapshot; it is not a fixed fixture. The harness never starts a server or Chrome.

On the Mac, first check that the ports are free; don't stop another thread's processes:

```sh
export PATH="$HOME/.bun/bin:$PATH"
lsof -nP -iTCP:5191 -sTCP:LISTEN
lsof -nP -iTCP:9222 -sTCP:LISTEN
```

Run these as two persistent processes, stepping up the ports when occupied:

```sh
PLAYER_DATA_MODE=fixtures bun scripts/run-node.ts vite --port 5191 --strictPort
'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-design-review
```

With both running, either instrument is one command:

```sh
bun scripts/shots.ts --base 'http://[::1]:5191'
bun scripts/design-audit.ts --base 'http://[::1]:5191'
```

Both accept `--cdp http://127.0.0.1:9222`, `--out .shots` and `--only home,matches-results,player`. Screenshots additionally accept `--fold-only` and `--reduced-motion`. The audit accepts `--strict` to exit nonzero on a measured failure; without it, failures are findings rather than process errors. `.shots/` is ignored; another output directory is the caller's responsibility.

Run the instruments sequentially on a dedicated headless profile, not concurrently against a person's normal Chrome. A reused profile retains spoiler preferences, recently viewed players and favourites; use a new `--user-data-dir` for a fresh-reader comparison. The scripts do not clear another session's storage. Relative timestamps and the cached esports snapshot can change, so this is a repeatable capture workflow, not byte-identical snapshot testing.

## What gets captured

The shared catalog in `scripts/surfaces.ts` covers home, both Matches tabs, the open event filter, Events and an event, Drafts, the simulator and its open **format** picker, Players, the leaderboard, recorded Sypeh (`670067075`), a match and Review. Match/event links are discovered from the served data. The recorded player is deliberate: arbitrary leaderboard players are not in the fixture set.

Each surface gets an exact 1440×900 and 390×844 PNG named `<surface>-<size>-fold.png`, plus a `-full.png` with the page capped at 9000 CSS pixels. The dimensions describe a headless viewport, not proof on a physical phone. Normal motion is the default; `--reduced-motion` is a separate state, not a way to hide animation bugs. Captures wait for React attachment, font loading and a stable text/layout signature. These are heuristics, not a guarantee that every asynchronous state has settled.

`captures.json` records the source SHA, time, origin, filenames and browser warnings. Console warnings are not silently discarded, except Motion's informational reduced-motion notice. The command closes only the tab it created. It leaves the server, Chrome and all other tabs alone. CDP requests time out after 90 seconds; a server that waits for upstream data can still take minutes to sweep.

## What gets measured

`audit.json` contains the source SHA and each surface's measurements and labelled rule results:

- Applied font-size/weight/line-height combinations, character counts, and distinct sizes competing in the first viewport.
- Padding/gap/margin values against a named scale, plus actual vertical distances between same-column sibling blocks. Optical 1/2px adjustments are counted separately from the 4px rhythm.
- Text contrast using canvas-resolved CSS colours (including OKLCH), alpha compositing and backgrounds under the text. Gradients and layered selected-tab labels are skipped rather than reported as proven contrast passes.
- Chromatic hue families in text, fills and borders (not image assets); this is a colour-budget prompt, not proof that the colours are semantically wrong.
- Standalone interactive rectangles on narrow screens, page overflow and the first 24 desktop Tab stops' outline/box-shadow presence. Inline prose links are excluded from the target-size heuristic.
- First-viewport match density in `main`, excluding the global score strip, and a representative match card's type ranks.

The limits are a proposed Rivals Hub bar, not numbers reverse-engineered from every reference. Existing pages can fail. Do not change unrelated UI or vendored beUI just to turn the report green.

## What still needs eyes and hands

Open every image you use as evidence. Compare the same task and width with one of the [studied references](design-study.md), not an unrelated marketing homepage. Record a pass/fail for reading order, grouping, name/score/status anatomy, selected context, empty-state recovery and competing emphasis.

Contrast is a best-effort DOM estimate, not a replacement for a full accessibility audit: pseudo-elements, blend modes, occlusion, clipping and complex images need inspection. Focus-ring detection checks presence, not contrast or whether the ring was clipped; 24 stops do not cover the whole page. The script does not prove focus restoration, screen-reader output, hover, animation quality, loading/error/private-history states, real-time score changes or spoiler behaviour. Capture those separately when a change touches them.

The [baseline critique](design-critique.md) is intentionally a set of small proposals, not permission to redesign the app.
