# Architecture and operations

Implementation and deployment reference for [Rivals Hub](../README.md).

## How it stays live

1. `crons/sync-liquipedia.ts` runs every minute. It asks Liquipedia for the revision ids of every `MR Ignite/2026/*` page in one request, then downloads only the pages that changed (a second request).
2. Parsed events and matches are stored as one KV value (`snapshot`). Each run computes the next value from Liquipedia's changed pages and mrvl's map results and writes it at most once, only when it changed.
3. After a change, the cron publishes on the `scores` live topic (`void/live`, SSE). Open pages refetch `/api/snapshot`, and also poll every 45s as a fallback.
4. Score changes show as toasts (map won, series won, match went live).
5. The same cron links live and recent series to mrvl.net and stores MVP/SVP, heroes, bans, protects in draft order and player stats per map (`stats:v2:<matchId>`). Map winners mrvl has before Liquipedia fill in early. See [ADR 4](adr/0004-mrvl-for-player-stats.md). `/drafts` counts them per hero and `/drafts/simulator` steps through the Ignite 2026 draft.

Liquipedia asks API users for an identifying User-Agent, gzip, and at most one request every 2 seconds; `src/liquipedia/client.ts` enforces that within an isolate. Each run also stops at 8 Liquipedia requests or 30 seconds, whichever comes first, to keep work within the minute; pages it couldn't fetch wait for the next run. This is a per-run budget, not a cross-isolate lock. See [ADR 5](adr/0005-per-run-liquipedia-budget.md). Team logos, event icons and mrvl hero/map art go through `/api/image` because Liquipedia blocks hotlinking.

## Run locally

```sh
bun install --frozen-lockfile
bunx void db migrate   # create or update the local D1 tables (players section)
PLAYER_DATA_MODE=fixtures bun run dev
```

Use Bun 1.4.2 and Node.js 24.22.2 from `.node-version`, with Node on `PATH` for `bunx`. The dev server runs at http://localhost:5180. `bun run dev`, `build`, `preview`, `deploy` and `codegen` launch Vite and Void under Node; `scripts/run-node.ts` finds it in `$NODE`, on `PATH`, or under `~/.nvm/versions/node`. Its compatibility floor is Node 22.12, but the pinned project version is the supported setup. Running Vite directly under Bun fails on macOS during Void's Cloudflare config migration.

`bun run check` (format, lint, boundaries, typecheck, tests) writes `.void/` before it typechecks, so it works on a fresh clone without a dev run or a build first.

Cron triggers don't fire under `vite dev`, so in development `/api/snapshot` syncs itself at most once a minute. To fire the cron by hand, use the curl command Void prints on start.

No API key is required for fixture-mode player pages. This doesn't disable esports requests: a cold local KV triggers a paced Liquipedia/mrvl sync. Images also use the network. See the [verification guide](../.claude/skills/verify/SKILL.md) for isolated ports, a warm local snapshot and recorded player flows. Never copy production databases or secrets into a contribution.

| Script                              | Purpose                                                 |
| ----------------------------------- | ------------------------------------------------------- |
| `bun run dev`                       | Development server on port 5180                         |
| `bun run build` / `bun run preview` | Production build / local preview                        |
| `bun run fmt` / `bun run fmt:check` | Format / check formatting                               |
| `bun run lint`                      | Oxlint, with warnings treated as failures               |
| `bun run boundaries`                | Enforce module import boundaries                        |
| `bun run codegen`                   | Generate ignored `.void/` route, env and database types |
| `bun run typecheck`                 | Generate types, then check app and vendor code          |
| `bun run test`                      | Vitest tests beside source and in `scripts/`            |
| `bun run check`                     | Formatting, lint, boundaries, typecheck and tests       |
| `bun run deploy`                    | Deploy to the saved destination; not a preview command  |

## Players section

Player data comes from [RivalsTracker](https://rivalstracker.com), which relays the game's own profile, match and leaderboard data. By default the dev server replays recorded responses at no cost. Production must set `PLAYER_DATA_MODE=live`; `PLAYER_DATA_REQUESTS_PER_DAY` (default 300) caps upstream requests and `/api/credits` shows today's count. `PLAYER_DATA_MODE=off` turns the players section off. See [ADR 9](adr/0009-rivalstracker-for-player-data.md).

## Deploy

A push to `main` deploys to Cloudflare from GitHub Actions, and only after the same check a pull request gets: `.github/workflows/deploy.yml` runs `ci.yml` first and will not deploy a tree that fails it. Runs queue rather than cancel, and the deploy job runs in the `production` environment, so required reviewers can be added there without touching the workflow. To redeploy by hand, run Actions → Deploy → Run workflow on `main`; from any other branch it runs the check and skips the deploy.

This configuration targets the maintainer's production site. Before deploying a fork, configure a separate Cloudflare account/resources, replace the saved destination in `void.lock.json` through Void's CLI, and change the custom domain in `void.config.ts`. Use your own scoped token; never request or copy the maintainer's token. Keep local `.env` files untracked and put CI credentials in GitHub Actions secrets, not workflow YAML. The saved resource IDs are identifiers, not authentication credentials.

The PR workflow uses `pull_request`, a read-only `GITHUB_TOKEN`, and no deployment secret. It runs contributor code, so review workflow changes and never change it to run untrusted fork code with `pull_request_target` or production credentials. Enable approval for outside contributors and protect `main` with required checks/review before accepting public contributions. Restrict the production environment to `main` and add a reviewer if a manual deployment gate is wanted. Dependency-install scripts and changes merged to `main` run with the trust of the deploy job; a green check does not replace review.

The deploy needs one secret, `CLOUDFLARE_API_TOKEN`, set as a repository secret or as an environment secret on `production`, and the workflow stops at its first step with that instruction when it is missing. The Cloudflare API token needs:

| Scope   | Permission               | For                                                                       |
| ------- | ------------------------ | ------------------------------------------------------------------------- |
| Account | Workers Scripts: Edit    | uploads the version and publishes it                                      |
| Account | Workers KV Storage: Read | binds the `KV` namespace; Edit when a deploy creates a namespace          |
| Account | D1: Edit                 | applies pending `db/migrations`; a deploy with none pending only reads it |
| Zone    | Workers Routes: Edit     | attaches the `rivalshub.kellycooks.dev` route                             |
| Zone    | DNS: Edit                | creates that custom domain's DNS record and certificate                   |
| Zone    | Zone: Read               | reads the zone those routes belong to                                     |

Zone Resources must include `kellycooks.dev`, which the `rivalshub.kellycooks.dev` custom domain in `void.config.ts` attaches to. No account id or worker subdomain is needed: `void.lock.json` records the account, and `preview_urls` gives the readiness check a URL to probe.

```sh
bun run deploy                        # deploy from this machine instead
```

It serves https://rivalshub.kellycooks.dev, alongside the Worker's workers.dev and preview hostnames.

If publication fails, Actions retains `deployment-diagnostics-<run>-<attempt>` for seven days. It contains only allowlisted failure UUIDs and reasons plus a bounded, read-only observation of current traffic, the expected custom domain, the minute cron and Worker visibility. Missing permissions are reported as unavailable; diagnostics do not request broader scopes, retry deployment or change its failed result. The artifact is a later observation, not the deployment-list responses that the CLI saw during publication. Raw Void logs and response/error bodies are not uploaded. This improves evidence for the recurring ownership-verification failure; the ownership fix is separate.

A pinned Bun patch, `patches/@void%2Fdeploy-cloudflare@1.7.0.patch`, confirms Worker ownership after an atomic publish. Void 1.7 reads production traffic immediately after publishing, and that read can still name the version serving beforehand: Cloudflare's deployment list lagged twelve seconds behind a publish that it already reported complete. The stock guard treated a stale read as a competing deploy at three separate checks, and failed the deploy even when its own repair had already confirmed the new version owns traffic. The patch routes all of those checks through one confirmation that re-reads while traffic still names the pre-publish version, bounded by `publicationConfirmAttempts`, `publicationConfirmIntervalMs` and `publicationConfirmTimeoutMs`. A third version, split traffic, an unreadable status or an exhausted budget still fail closed, and it publishes nothing. `scripts/void-deploy-guard.test.ts` proves it through the real guard with `fetch` at the Cloudflare HTTP boundary, the CLI asserted never to run, and a check that the bundle keeps every post-publish check on the tolerant path. Add a line under **Unreleased** in `CHANGELOG.md` when Void ships an equivalent fix and this patch is dropped.

## Layout

| Path                                          | What                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/domain/`                                 | Zod schemas, `matchState` (live / upcoming / finished) and scoping            |
| `src/liquipedia/`                             | Liquipedia API client (pacing and per-run budget), wikitext parser, teams     |
| `src/mrvl/`                                   | mrvl.net client and Liquipedia↔mrvl linking                                   |
| `src/store/plan.ts`                           | Pure sync planning: what changed, the next stored snapshot                    |
| `src/store/run.ts`                            | One sync run: fetch, compute, write each KV key at most once                  |
| `src/store/snapshot.ts`, `src/store/stats.ts` | Liquipedia and mrvl fetching, KV reads and writes through a `KvStore`         |
| `src/sync.ts`, `crons/`, `routes/`, `pages/`  | Runtime shell: binds void/kv, D1 and the clients, cron, API routes, SSR pages |
| `src/ui/`, `src/components/motion/`           | React views; beUI components (copied from the registry)                       |
