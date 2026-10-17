# 5. A request budget per sync run instead of a lock

## Context

Liquipedia allows at most one API request per 2 seconds. The client waits out that gap, but only within one Workers isolate. The cron fires every minute whether or not the previous run finished, so a run that took longer than a minute could overlap the next one in another isolate and together they would exceed the limit. A distributed lock in KV would need a write every minute, about 1,440 a day, over the free tier's 1,000.

## Decision

Bound every run instead. `syncOnce` starts a budgeted Liquipedia run: at most 8 requests, and none started more than 30 seconds after the run began. A run fetches at most 50 changed pages (one contents request) and 40 missing teams (one template expansion). Work the budget can't cover is deferred, not dropped: those pages keep their old revision ids in KV, so the next run's `planSync` picks them up. A page commits only together with its event icon, because icons are looked up only when a page's revision changes.

## Consequences

- Two cron runs can't overlap on Liquipedia: the last request of one starts at least 30 seconds before the next begins.
- When Liquipedia is very slow, updates arrive over several runs instead of one late run.
- Runs started by page loaders when KV is empty (first deploy, or after a schema bump) are still deduplicated only per isolate, so several isolates can rebuild at once. Each is budgeted, but together they can exceed the rate for that minute.
