# 1. Void on Cloudflare Workers instead of TanStack Start + Elysia

## Context

The default stack is TanStack Start with Elysia on Workers. This app needs a minute cron, a small key-value store, server-rendered pages and a push channel to open tabs.

## Decision

Use Void (Vite + Hono on Workers). It provides crons (`crons/`), KV (`void/kv`), SSR pages with loaders, and SSE fan-out over Durable Objects (`void/live`) with no extra services.

## Consequences

- Deploys with `void deploy` to Cloudflare or a Void platform.
- The data store is one KV value, not Postgres; see ADR 2.
- Void is young; the bundled docs in `node_modules/void/docs` are the reference.
