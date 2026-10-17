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
import { fakeMrvl, FLY_100T_MRVL_ID, type MrvlFakeOptions } from "../../test/fakeMrvl";
import { memoryKvStore } from "../../test/memoryKv";
import { syncOnce } from "./run";

// Liquipedia ids from the recorded Americas bracket.
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
});
