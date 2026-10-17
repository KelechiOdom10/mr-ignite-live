# 7. D1 for player data, beside the KV snapshot

## Context

ADR 2 keeps esports data in one KV snapshot and says to move to D1 if favourites or history arrive. The players section needs favourites (a list), a response cache keyed by endpoint and uid, immutable match details, and a credit ledger that has to be summed and reserved atomically.

## Decision

Use D1 through `void/db` (Drizzle, bundled with Void) for player data only. Tables live in `db/schema.ts` with committed migrations in `db/migrations/`. Only `src/store/d1.ts` imports `void/db`; the rest of the store reaches D1 through interfaces such as `FavouriteStore`. Esports stays on KV.

## Consequences

- Run `bunx void db migrate` once locally after pulling a new migration.
- Two storage systems in one worker; each section owns one.
- Rows read back from D1 are parsed with the domain schemas, like KV values.
