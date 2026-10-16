# 3. Liquipedia for schedule and scores

## Context

Liquipedia editors update Ignite pages minutes after each map. Its MediaWiki API is public with rules: identifying User-Agent, gzip, at most one request per 2s. It has no MVP, hero or player stats.

## Decision

Poll revision ids for all `MR Ignite/2026/*` pages each minute in one request, and fetch content only for pages that changed. Proxy team logos through `/api/image` because Liquipedia blocks image hotlinks.

## Consequences

- Freshness is bounded by Liquipedia editors plus about a minute.
- Stats need a second source; see the stats research in the README.
