# Ignite Live

Live Marvel Rivals Ignite 2026 scores, brackets and results, built on [Void](https://void.cloud) with [beUI](https://beui.dev) components.

## How it stays live

1. `crons/sync-liquipedia.ts` runs every minute. It asks Liquipedia for the revision ids of every `MR Ignite/2026/*` page in one request, then downloads only the pages that changed (a second request).
2. Parsed events and matches are stored as one KV value (`snapshot`). Each run computes the next value from Liquipedia's changed pages and mrvl's map results and writes it at most once, only when it changed.
3. After a change, the cron publishes on the `scores` live topic (`void/live`, SSE). Open pages refetch `/api/snapshot`, and also poll every 45s as a fallback.
4. Score changes show as toasts (map won, series won, match went live).
5. The same cron links live and recent series to mrvl.net and stores MVP/SVP, heroes, bans and player stats per map (`stats:v2:<matchId>`). Map winners mrvl has before Liquipedia fill in early. See [ADR 4](docs/adr/0004-mrvl-for-player-stats.md).

Liquipedia asks API users for an identifying User-Agent, gzip, and at most one request every 2 seconds; `src/liquipedia/client.ts` enforces that within an isolate. Each run also stops at 8 Liquipedia requests or 30 seconds, whichever comes first, so it can't overlap the next minute's run in another isolate; pages it couldn't fetch wait for the next run. See [ADR 5](docs/adr/0005-per-run-liquipedia-budget.md). Team logos, event icons and mrvl hero/map art go through `/api/image` because Liquipedia blocks hotlinking.

## Run locally

```sh
bun install
bun run dev        # http://localhost:5180
```

Cron triggers don't fire under `vite dev`, so in development `/api/snapshot` syncs itself at most once a minute. To fire the cron by hand, use the curl command Void prints on start.

## Deploy

```sh
bunx void deploy                      # first time: choose Cloudflare or a Void platform
```

## Layout

| Path                                          | What                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| `src/domain/`                                 | Zod schemas, `matchState` (live / upcoming / finished) and scoping        |
| `src/liquipedia/`                             | Liquipedia API client (pacing and per-run budget), wikitext parser, teams |
| `src/mrvl/`                                   | mrvl.net client and Liquipedia↔mrvl linking                               |
| `src/store/plan.ts`                           | Pure sync planning: what changed, the next stored snapshot                |
| `src/store/run.ts`                            | One sync run: fetch, compute, write each KV key at most once              |
| `src/store/snapshot.ts`, `src/store/stats.ts` | Liquipedia and mrvl fetching, KV reads and writes through a `KvStore`     |
| `src/sync.ts`, `crons/`, `routes/`, `pages/`  | Runtime shell: binds void/kv and the clients, cron, API routes, SSR pages |
| `src/ui/`, `src/components/motion/`           | React views; beUI components (copied from the registry)                   |
