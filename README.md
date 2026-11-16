# Rivals Hub

A personal Marvel Rivals site. Its esports section has live Ignite 2026 scores, brackets and results, built on [Void](https://void.cloud) with [beUI](https://beui.dev) components.

## How it stays live

1. `crons/sync-liquipedia.ts` runs every minute. It asks Liquipedia for the revision ids of every `MR Ignite/2026/*` page in one request, then downloads only the pages that changed (a second request).
2. Parsed events and matches are stored as one KV value (`snapshot`). Each run computes the next value from Liquipedia's changed pages and mrvl's map results and writes it at most once, only when it changed.
3. After a change, the cron publishes on the `scores` live topic (`void/live`, SSE). Open pages refetch `/api/snapshot`, and also poll every 45s as a fallback.
4. Score changes show as toasts (map won, series won, match went live).
5. The same cron links live and recent series to mrvl.net and stores MVP/SVP, heroes, bans, protects in draft order and player stats per map (`stats:v2:<matchId>`). Map winners mrvl has before Liquipedia fill in early. See [ADR 4](docs/adr/0004-mrvl-for-player-stats.md). `/drafts` counts them per hero and `/drafts/simulator` steps through the Ignite 2026 draft.

Liquipedia asks API users for an identifying User-Agent, gzip, and at most one request every 2 seconds; `src/liquipedia/client.ts` enforces that within an isolate. Each run also stops at 8 Liquipedia requests or 30 seconds, whichever comes first, so it can't overlap the next minute's run in another isolate; pages it couldn't fetch wait for the next run. See [ADR 5](docs/adr/0005-per-run-liquipedia-budget.md). Team logos, event icons and mrvl hero/map art go through `/api/image` because Liquipedia blocks hotlinking.

## Run locally

```sh
bun install
bunx void db migrate   # create or update the local D1 tables (players section)
bun run dev            # http://localhost:5180 (players section replays recorded fixtures)
```

`bun run dev`, `build`, `preview`, `deploy` and `codegen` run Vite and void under Node 22.12 or newer; `scripts/run-node.ts` finds one in `$NODE`, on `PATH`, or under `~/.nvm/versions/node`. Bun alone can't run Vite or deploy, because void's Cloudflare config migration fails under bun on macOS with `cf could not translate the built Cloudflare configuration`.

`bun run check` (format, lint, boundaries, typecheck, tests) writes `.void/` before it typechecks, so it works on a fresh clone without a dev run or a build first.

Cron triggers don't fire under `vite dev`, so in development `/api/snapshot` syncs itself at most once a minute. To fire the cron by hand, use the curl command Void prints on start.

## Players section

Player data comes from [RivalsTracker](https://rivalstracker.com), which relays the game's own profile, match and leaderboard data. By default the dev server replays recorded responses at no cost. Production must set `PLAYER_DATA_MODE=live`; `PLAYER_DATA_REQUESTS_PER_DAY` (default 300) caps upstream requests and `/api/credits` shows today's count. `PLAYER_DATA_MODE=off` turns the players section off. See [ADR 9](docs/adr/0009-rivalstracker-for-player-data.md).

## Deploy

A push to `main` deploys to Cloudflare from GitHub Actions, and only after the same check a pull request gets: `.github/workflows/deploy.yml` runs `ci.yml` first and will not deploy a tree that fails it. Runs queue rather than cancel, and the deploy job runs in the `production` environment, so required reviewers can be added there without touching the workflow. To redeploy by hand, run Actions → Deploy → Run workflow on `main`; from any other branch it runs the check and skips the deploy.

The deploy needs one secret, `CLOUDFLARE_API_TOKEN`, set as a repository secret or as an environment secret on `production`, and the workflow stops at its first step with that instruction when it is missing. The Cloudflare API token needs:

| Scope   | Permission               | For                                                                       |
| ------- | ------------------------ | ------------------------------------------------------------------------- |
| Account | Workers Scripts: Edit    | uploads the version, publishes it, applies Durable Object migrations      |
| Account | Workers KV Storage: Read | binds the `KV` namespace; Edit when a deploy creates a namespace          |
| Account | D1: Edit                 | applies pending `db/migrations`; a deploy with none pending only reads it |
| Zone    | Workers Routes: Edit     | attaches the `rivalshub.kellycooks.dev` route                             |
| Zone    | DNS: Edit                | creates that custom domain's DNS record and certificate                   |
| Zone    | Zone: Read               | reads the zone those routes belong to                                     |

Zone Resources must include `kellycooks.dev`. The zone rows only matter once the route lands in `void.config.ts`. No account id or worker subdomain is needed: `void.lock.json` records the account, and `preview_urls` gives the readiness check a URL to probe.

```sh
bun run deploy                        # deploy from this machine instead
```

It serves https://rivalshub.kellycooks.dev, alongside the Worker's workers.dev and preview hostnames.

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
