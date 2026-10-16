# 2. One KV snapshot instead of a database

## Context

All data comes from roughly 40 Liquipedia pages and changes a few times an hour during play. Cloudflare's free KV allows 1,000 writes a day.

## Decision

Store everything as one versioned KV value (`snapshot`, schema `StoredSnapshotSchema`). The cron writes only when a page revision changed.

## Consequences

- One read serves any page; no joins or migrations.
- Shape changes bump `STORED_SNAPSHOT_VERSION`; an old value fails the schema and is rebuilt from Liquipedia on the next sync.
- If history, favourites or accounts arrive, move to D1.
