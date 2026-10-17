# 2. One KV snapshot instead of a database

## Context

All data comes from roughly 40 Liquipedia pages and changes a few times an hour during play. Cloudflare's free KV allows 1,000 writes a day.

## Decision

Store everything as one versioned KV value (`snapshot`, schema `StoredSnapshotSchema`). Each sync run computes the next value purely (`nextStored` in `src/store/plan.ts`) from Liquipedia's changed pages, newly seen teams and mrvl's map results, and writes it at most once, only when one of those changed. Store code reaches KV through a `KvStore` passed in, so the write decisions run under test against an in-memory store that counts puts per key.

## Consequences

- One read serves any page; no joins or migrations.
- A minute with nothing new costs no KV write; a minute with both a Liquipedia edit and new mrvl map results costs one snapshot write, plus the mrvl stats record and index.
- Shape changes bump `STORED_SNAPSHOT_VERSION`; an old value fails the schema and is rebuilt from Liquipedia on the next sync.
- If history, favourites or accounts arrive, move to D1.
