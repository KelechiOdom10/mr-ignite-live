import { describe, expect, it } from "vitest";

import { createLiquipediaClient } from "@/liquipedia/client";
import { createMrvlClient } from "@/mrvl/client";

import {
  AMERICAS,
  AMERICAS_GROUPS,
  fakeClock,
  fakeLiquipedia,
  PACIFIC,
  RECORDED_TITLES,
} from "../../test/fakeLiquipedia";
import {
  fakeMrvl,
  FLY_100T_MRVL_ID,
  type MrvlFakeOptions,
  TLC_SWAMP_MRVL_ID,
} from "../../test/fakeMrvl";
import { memoryKvStore } from "../../test/memoryKv";
import type { KvKey, KvStore } from "./kv";
import { syncOnce } from "./run";
import { readStored } from "./snapshot";
import { STATS_INDEX_KEY, statsKey } from "./stats";

// Liquipedia ids from the recorded Americas bracket.
/** A value the sync stored under `key`; fails the test when it's missing or off-schema. */
async function read<T>(store: KvStore, key: KvKey<T>): Promise<T> {
  const parsed = await store.get(key);

  if (!parsed?.success) throw new Error(`No valid value at ${key.name}`);

  return parsed.data;
}

const FLY_100T = "kOKqgtPHq4_R2M1";
const TLC_SWAMP = "kOKqgtPHq4_R2M2";

/**
 * Match day as recorded on 2026-10-16: FlyQuest beat 100 Thieves at 20:00 UTC and Liquid
 * Citadel vs Swamp Gaming is live, so both are stats candidates.
 */
function matchDay({ mrvl: mrvlOptions }: { mrvl?: MrvlFakeOptions } = {}) {
  const clock = fakeClock("2026-10-16T22:30:00Z");
  const store = memoryKvStore({ "titles:v1": RECORDED_TITLES });

  const liquipedia = fakeLiquipedia({
    clock,
    revids: { [AMERICAS]: 60100, [PACIFIC]: 60081, [AMERICAS_GROUPS]: 60050 },
  });

  const mrvl = fakeMrvl(mrvlOptions);

  const deps = {
    store,
    liquipedia: createLiquipediaClient({
      fetch: liquipedia.fetch,
      now: clock.now,
      wait: async (ms) => clock.advance(ms),
    }),
    mrvl: createMrvlClient({ fetch: mrvl.fetch, timeoutMs: 20 }),
    now: clock.now,
  };

  return {
    store,
    liquipedia,
    mrvl,
    clock,
    /** One cron run, a minute after the last. */
    sync: async () => {
      clock.advance(60_000);

      return syncOnce(deps);
    },
    settle: async () => {
      for (let run = 0; run < 2; run++) {
        clock.advance(60_000);
        await syncOnce(deps);
      }
    },
  };
}

describe("syncOnce on match day", () => {
  it("writes nothing and publishes nothing when neither Liquipedia nor mrvl changed", async () => {
    const day = matchDay();
    await day.settle();
    day.store.resetPuts();

    const outcome = await day.sync();

    expect(day.store.putCounts()).toEqual({});
    expect(outcome.changed).toBe(false);
  });

  it("builds a cold store with one snapshot write even when mrvl adds map results", async () => {
    const day = matchDay();

    const outcome = await day.sync();

    expect(day.store.putCounts()).toEqual({
      snapshot: 1,
      [`stats:v2:${FLY_100T}`]: 1,
      "stats-index:v2": 1,
      "stats-backfill-misses:v1": 1,
    });
    expect(outcome.changed).toBe(true);
  });

  it("costs one snapshot write for a changed Liquipedia page plus new mrvl map results", async () => {
    const day = matchDay({ mrvl: { down: true } });
    await day.sync();
    day.store.resetPuts();
    day.mrvl.settings.down = false;
    day.liquipedia.revids[AMERICAS] = 60101;

    const outcome = await day.sync();

    expect(day.store.putCounts()).toEqual({
      snapshot: 1,
      [`stats:v2:${FLY_100T}`]: 1,
      "stats-index:v2": 1,
      "stats-backfill-misses:v1": 1,
    });
    expect(outcome.changedPages).toBe(1);
    const stored = await readStored(day.store);
    expect(stored?.pages[AMERICAS]?.revid).toBe(60101);
    expect(stored?.mapOverrides[FLY_100T]?.map((m) => m.winner)).toEqual([2, 1, 1, 1]);
  });

  it("a slow Liquipedia still commits changed pages within a few runs instead of refetching them forever", async () => {
    // 16s responses: contents arrive at 32s, so every follow-up lookup misses the 30s window.
    const day = matchDay();
    day.liquipedia.settings.latencyMs = 16_000;
    const runOffsets: number[][] = [];
    const runPuts: Record<string, number>[] = [];

    for (let run = 0; run < 4; run++) {
      const startsAt = day.clock.now() + 60_000;
      const before = day.liquipedia.requests.length;
      day.store.resetPuts();
      await day.sync();
      runOffsets.push(day.liquipedia.requests.slice(before).map((r) => r.at - startsAt));
      runPuts.push(day.store.putCounts());
    }

    const stored = await readStored(day.store);
    expect(Object.keys(stored?.pages ?? {}).sort()).toEqual([...RECORDED_TITLES].sort());
    expect(stored?.teams["Liquid Citadel"]).toEqual({
      short: "TLC",
      logoDark: null,
      logoLight: null,
    });
    const contents = day.liquipedia.requests.filter((r) => r.params.get("rvprop") === "content");
    expect(contents).toHaveLength(1);
    expect(runOffsets).toEqual([[0, 16_000], [0, 16_000], [0, 16_000], [0]]);
    expect(runPuts.map((puts) => puts.snapshot ?? 0)).toEqual([1, 1, 1, 0]);
  });

  it("commits a found event icon with its page and doesn't look it up again on the page's next edit", async () => {
    const day = matchDay();
    const iconUrl = "https://liquipedia.net/commons/images/thumb/MRIG_Americas_allmode.png";
    day.liquipedia.settings.images = { "MRIG Americas allmode.png": iconUrl };

    await day.sync();

    expect(day.store.putCounts().snapshot).toBe(1);
    expect((await readStored(day.store))?.pages[AMERICAS]?.event?.iconUrl).toBe(iconUrl);

    day.liquipedia.revids[AMERICAS] = 60101;
    const before = day.liquipedia.requests.length;
    await day.sync();

    const lookups = day.liquipedia.requests
      .slice(before)
      .filter((r) => r.params.get("prop") === "imageinfo");

    expect(lookups).toEqual([]);
    const americas = (await readStored(day.store))?.pages[AMERICAS];
    expect([americas?.revid, americas?.event?.iconUrl]).toEqual([60101, iconUrl]);
  });

  it("still saves Liquipedia's changes when mrvl is down", async () => {
    const day = matchDay({ mrvl: { down: true } });

    const outcome = await day.sync();

    expect(day.store.putCounts()).toEqual({ snapshot: 1 });
    expect(outcome.changed).toBe(true);
    expect(outcome.snapshot.matches.map((m) => m.id)).toContain(TLC_SWAMP);
  });

  it("rewrites neither stats nor the snapshot when mrvl re-saves a series with identical stats", async () => {
    // mrvl bumps updatedAt on bulk edits, so the page is refetched; only the index records that.
    const day = matchDay();
    await day.settle();
    day.store.resetPuts();
    day.mrvl.settings.resaved = [FLY_100T_MRVL_ID];
    const earlierRequests = day.mrvl.requests.length;

    const outcome = await day.sync();

    const refetched = day.mrvl.requests
      .slice(earlierRequests)
      .filter((r) => r.path === "matches:getPageData");

    expect(refetched.map((r) => r.args.id)).toEqual([FLY_100T_MRVL_ID]);
    expect(day.store.putCounts()).toEqual({ "stats-index:v2": 1 });
    expect(outcome.changed).toBe(false);
  });

  it("refetches a recent series indexed before draft order was kept, once", async () => {
    const day = matchDay();
    await day.sync();
    const key = statsKey(FLY_100T);
    const stored = await read(day.store, key);
    // Entries saved without a draft read back as `draft: null`.
    await day.store.put(key, { ...stored, maps: stored.maps.map((m) => ({ ...m, draft: null })) });
    const index = await read(day.store, STATS_INDEX_KEY);
    const entry = index[FLY_100T];

    if (!entry) throw new Error("FLY–100T should be indexed after the first sync");
    await day.store.put(STATS_INDEX_KEY, {
      ...index,
      [FLY_100T]: { sourceMatchId: FLY_100T_MRVL_ID, sourceUpdatedAt: entry.sourceUpdatedAt },
    });

    const pageRequests = () =>
      day.mrvl.requests.filter(
        (r) => r.path === "matches:getPageData" && r.args.id === FLY_100T_MRVL_ID,
      ).length;

    const before = pageRequests();

    await day.sync();
    await day.sync();

    expect(pageRequests() - before).toBe(1);
    const backfilled = await read(day.store, key);
    expect(backfilled.maps.every((m) => m.draft?.length === 14)).toBe(true);
  });

  it("refetches a recent series indexed before per-hero lines were kept, once", async () => {
    const day = matchDay();
    await day.sync();
    const key = statsKey(FLY_100T);
    const stored = await read(day.store, key);

    const withoutLines = {
      ...stored,
      maps: stored.maps.map((m) => ({
        ...m,
        teams: m.teams.map((t) => ({
          ...t,
          players: t.players.map((p) => ({
            ...p,
            heroes: p.heroes.map(({ line: _, ...h }) => h),
          })),
        })),
      })),
    };

    await day.store.put(key, withoutLines);
    const index = await read(day.store, STATS_INDEX_KEY);
    const entry = index[FLY_100T];

    if (!entry) throw new Error("FLY–100T should be indexed after the first sync");
    await day.store.put(STATS_INDEX_KEY, {
      ...index,
      [FLY_100T]: {
        sourceMatchId: FLY_100T_MRVL_ID,
        sourceUpdatedAt: entry.sourceUpdatedAt,
        draftOrder: true,
      },
    });

    const pageRequests = () =>
      day.mrvl.requests.filter(
        (r) => r.path === "matches:getPageData" && r.args.id === FLY_100T_MRVL_ID,
      ).length;

    const before = pageRequests();

    await day.sync();
    await day.sync();

    expect(pageRequests() - before).toBe(1);
    const backfilled = await read(day.store, key);

    const heroes = backfilled.maps.flatMap((m) =>
      m.teams.flatMap((t) => t.players.flatMap((p) => p.heroes)),
    );

    expect(heroes.length).toBeGreaterThan(0);
    expect(heroes.every((h) => h.line)).toBe(true);
  });

  it("still saves Liquipedia's changes when an mrvl series' stats fail our schema", async () => {
    const day = matchDay({ mrvl: { misnumbered: [FLY_100T_MRVL_ID] } });

    const outcome = await day.sync();

    expect(day.store.putCounts()).toEqual({
      snapshot: 1,
      "stats-index:v2": 1,
      "stats-backfill-misses:v1": 1,
    });
    expect(outcome.updatedStats).toBe(0);
  });

  it("doesn't let one failing mrvl series page hold back the others, and retries it next run", async () => {
    const day = matchDay({ mrvl: { failingPages: [TLC_SWAMP_MRVL_ID] } });

    await day.sync();

    expect(day.store.putCounts()).toEqual({
      snapshot: 1,
      [`stats:v2:${FLY_100T}`]: 1,
      "stats-index:v2": 1,
      "stats-backfill-misses:v1": 1,
    });
    day.mrvl.settings.failingPages = [];
    const earlierRequests = day.mrvl.requests.length;
    await day.sync();

    const fetched = day.mrvl.requests
      .slice(earlierRequests)
      .filter((r) => r.path === "matches:getPageData");

    expect(fetched[0]?.args.id).toBe(TLC_SWAMP_MRVL_ID);
  });

  it("skips an mrvl series page that never answers instead of dropping every series' stats", async () => {
    const day = matchDay({ mrvl: { hangingPages: [TLC_SWAMP_MRVL_ID] } });

    await day.sync();

    expect(day.store.putCounts()).toEqual({
      snapshot: 1,
      [`stats:v2:${FLY_100T}`]: 1,
      "stats-index:v2": 1,
      "stats-backfill-misses:v1": 1,
    });
  });
});
