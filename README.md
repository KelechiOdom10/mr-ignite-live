# Ignite Live

Live Marvel Rivals Ignite 2026 scores, brackets and results, built on [Void](https://void.cloud) with [beUI](https://beui.dev) components.

## How it stays live

1. `crons/sync-liquipedia.ts` runs every minute. It asks Liquipedia for the revision ids of every `MR Ignite/2026/*` page in one request, then downloads only the pages that changed (a second request).
2. Parsed events and matches are stored as one KV value (`snapshot:v2`). KV is written only when a page changed.
3. After a write, the cron publishes on the `scores` live topic (`void/live`, SSE). Open pages refetch `/api/snapshot`, and also poll every 45s as a fallback.
4. Score changes show as toasts (map won, series won, match went live).
5. The same cron links live and recent series to mrvl.net and stores MVP/SVP, heroes, bans and player stats per map (`stats:v1:<matchId>`). Map winners mrvl has before Liquipedia fill in early. See [ADR 4](docs/adr/0004-mrvl-for-player-stats.md).

Liquipedia asks API users for an identifying User-Agent, gzip, and at most one request every 2 seconds; `src/liquipedia/client.ts` enforces that. Team logos, event icons and mrvl hero/map art go through `/api/image` because Liquipedia blocks hotlinking.

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

| Path                          | What                                                |
| ----------------------------- | --------------------------------------------------- |
| `src/data/liquipedia.ts`      | Liquipedia API client and wikitext → match parser   |
| `src/data/store.ts`           | KV snapshot sync                                    |
| `src/data/model.ts`           | Types and `matchState` (live / upcoming / finished) |
| `crons/`, `routes/`, `pages/` | Void cron, API routes, SSR pages                    |
| `src/components/motion/`      | beUI components (copied from the registry)          |
