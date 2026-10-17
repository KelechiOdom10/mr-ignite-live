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
import { syncOnce } from "./run";
import { readStored } from "./snapshot";

// Liquipedia ids from the recorded Americas bracket.
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
    mrvl: createMrvlClient({ fetch: mrvl.fetch }),
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
  };
}

describe("syncOnce on match day", () => {
  it("writes nothing and publishes nothing when neither Liquipedia nor mrvl changed", async () => {
    const day = matchDay();
    await day.sync();
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
    });
    expect(outcome.changedPages).toBe(1);
    const stored = await readStored(day.store);
    expect(stored?.pages[AMERICAS]?.revid).toBe(60101);
    expect(stored?.mapOverrides[FLY_100T]?.map((m) => m.winner)).toEqual([2, 1, 1, 1]);
  });

  it("defers changed pages when Liquipedia is slow instead of running into the next cron run", async () => {
    const day = matchDay();
    day.liquipedia.settings.latencyMs = 20_000;
    const startsAt = day.clock.now() + 60_000;

    const slow = await day.sync();

    // Revisions at 0s, contents at 20s; the icon lookup would start at 40s, past the 30s window.
    expect(day.liquipedia.requests.map((r) => r.at - startsAt)).toEqual([0, 20_000]);
    expect(day.store.putCounts()).toEqual({});
    expect(slow.deferredPages).toBe(3);

    day.liquipedia.settings.latencyMs = 0;
    const next = await day.sync();

    expect(next.changedPages).toBe(3);
    expect(day.store.putCounts().snapshot).toBe(1);
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
    await day.sync();
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

  it("doesn't let one failing mrvl series page hold back the others, and retries it next run", async () => {
    const day = matchDay({ mrvl: { failingPages: [TLC_SWAMP_MRVL_ID] } });

    await day.sync();

    expect(day.store.putCounts()).toEqual({
      snapshot: 1,
      [`stats:v2:${FLY_100T}`]: 1,
      "stats-index:v2": 1,
    });
    day.mrvl.settings.failingPages = [];
    const earlierRequests = day.mrvl.requests.length;
    await day.sync();
    const fetched = day.mrvl.requests
      .slice(earlierRequests)
      .filter((r) => r.path === "matches:getPageData");
    expect(fetched.map((r) => r.args.id)).toEqual([TLC_SWAMP_MRVL_ID]);
  });
});
