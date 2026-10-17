# Rivals Hub

A personal Marvel Rivals site, local-only. The esports section has live Ignite scores, brackets and results. A cron pulls Liquipedia every minute into one KV snapshot and pushes a change signal to open pages over `void/live`. See [README.md](README.md) for the data flow.

## Commands

| Command          | What                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `bun run dev`    | Dev server on http://localhost:5180 (syncs on read; crons don't fire in dev)              |
| `bun run check`  | Format check, lint (warnings fail), boundaries, typecheck, tests. Run before every commit |
| `bun run fmt`    | Format                                                                                    |
| `bun run test`   | Vitest (`src/**/*.test.ts`, `scripts/**/*.test.ts`)                                       |
| `bun run deploy` | `void deploy`                                                                             |

## Architecture

| Folder                                                  | Owns                                                                               | May import                                                    |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `src/domain/`                                           | Zod schemas (the single source of every type), `matchState`, scoping               | `zod` only                                                    |
| `src/liquipedia/`                                       | API client, wikitext parser, team templates                                        | `domain`                                                      |
| `src/mrvl/`                                             | mrvl.net Convex client and Liquipedia↔mrvl linking (stats, early map results)      | `domain`                                                      |
| `src/store/`                                            | Sync planning (pure, `plan.ts`), one sync run (`run.ts`), KV I/O through `KvStore` | `domain`, `liquipedia`, `mrvl`; `void/kv` only in `voidKv.ts` |
| `db/`, `src/store/d1.ts`                                | D1 schema, migrations and the player-data store (favourites)                       | within `src/store/`, `void/db` and `@schema` only in `d1.ts`  |
| `src/players.ts`                                        | Binds the players section to D1                                                    | everything                                                    |
| `src/sync.ts`, `crons/`, `routes/`, `pages/*.server.ts` | Runtime shell                                                                      | everything                                                    |
| `src/ui/`, `pages/*.tsx`                                | React views                                                                        | `domain`, `components`, `lib`                                 |
| `src/components/`, `src/lib/`                           | beUI, copied verbatim from https://beui.dev/r                                      | —                                                             |

Rules:

- `bun run boundaries` (`scripts/boundaries.ts`) enforces this table in `check`. A new folder fails until it has a rule there.
- Parse at the edge, trust inside: Liquipedia responses, KV values and the client's `/api/snapshot` fetch all go through Zod. No `as` casts on external data.
- Liquipedia's API terms: identifying User-Agent, gzip, at most one request per 2s, and only refetch pages whose revision changed. The client enforces the gap; `planSync` enforces the diff.
- Don't edit `src/components/` or `src/lib/`; re-pull from beUI instead. They're held to plain `strict` (`tsconfig.vendor.json`); app code also gets `noUncheckedIndexedAccess`.
- mrvl is a courtesy source: keep its request volume where `src/store/stats.ts` caps it, and never let its failure break the Liquipedia sync. Liquipedia map results always win over mrvl overrides.
- Bump `STORED_SNAPSHOT_VERSION` when the stored shape changes; an old value then fails the schema and is rebuilt.
- Every match surface (cards, strip chips, bracket slots, search results) links to `/match/:id`. Reuse `MatchCard` rather than drawing a new match tile.
- Render every match surface (score, winner, team names, maps, VODs, toasts) through `useMatchView` / `matchView` in `src/domain/matchView.ts`, passing the snapshot's matches; it applies Hide spoilers, so components don't check `useSpoilersHidden` themselves.
- Times render in the reader's zone after hydration (`useNow`, `useHydrated`) so server HTML matches the client.
- Tests sit next to the code and name the bug they catch. Fake only `fetch` and KV (`test/memoryKv.ts`); use recorded fixtures in `test/fixtures/` (see its `NOTES.md`), never hand-edited.
- After pulling a new `db/migrations/` file, run `bunx void db migrate`.
- Conventional Commits, no AI attribution.

## Docs

- [Domain rules](docs/domain.md)
- [Decisions](docs/adr/)

<!--injected-by-void-v1.1.11-->

## Void

- This project uses [Void](https://void.cloud), a full-stack Vite framework for Cloudflare Workers with file-based API routing, server-rendered pages, and typed backend services.
- Use Void's CLI and typed APIs. Before working with Void, read the relevant Markdown docs in `node_modules/void/docs/`; start with `guide/quickstart.md` for setup and `reference/cli.md` for commands.

<!--/injected-by-void-->
