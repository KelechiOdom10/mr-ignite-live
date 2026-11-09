import { describe, expect, it } from "vitest";

import { toProHeroStats } from "@/domain/proHeroStats";
import { createMrvlClient, type MrvlClient } from "@/mrvl/client";

import { mrvlFixture } from "../../test/fixtures";
import { JsonSchema } from "../../test/json";
import { memoryKvStore } from "../../test/memoryKv";
import { HERO_MATRIX_KEY, readHeroMatrix, refreshHeroMatrix } from "./heroMatrix";

const NOW = Date.parse("2026-11-09T20:00:00Z");
const HOUR = 60 * 60 * 1000;

function fixtureFetch(): typeof fetch {
  return async () => Response.json(mrvlFixture("hero-matrix.json"));
}

async function recorded(fetchImpl: typeof fetch = fixtureFetch()) {
  return createMrvlClient({ fetch: fetchImpl }).heroMatrix({
    startDate: "2026-09-01",
    endDate: "2026-09-30",
  });
}

async function storedAt(fetchedAt: string) {
  return JsonSchema.parse(
    toProHeroStats(await recorded(), {
      start: "2026-09-01",
      end: "2026-09-30",
      fetchedAt,
    }),
  );
}

describe("readHeroMatrix", () => {
  it("returns null when the stored value no longer parses", async () => {
    const store = memoryKvStore({ "hero-matrix:v1": { groups: "not a list" } });

    expect(await readHeroMatrix(store)).toBeNull();
  });
});

describe("refreshHeroMatrix", () => {
  it("refetches a value over an hour old and moves the window with the clock", async () => {
    const value = await storedAt(new Date(NOW - 2 * HOUR).toISOString());
    const store = memoryKvStore({ "hero-matrix:v1": value });

    const result = await refreshHeroMatrix({
      store,
      mrvl: createMrvlClient({ fetch: fixtureFetch() }),
      now: NOW,
    });

    expect(result?.fetchedAt).toBe(new Date(NOW).toISOString());
    expect(result?.window).toEqual({ start: "2026-10-11", end: "2026-11-09" });
    expect(store.putCounts()[HERO_MATRIX_KEY.name]).toBe(1);
  });

  it("makes no request while the stored value is under an hour old", async () => {
    const value = await storedAt(new Date(NOW - 30 * 60 * 1000).toISOString());
    const store = memoryKvStore({ "hero-matrix:v1": value });
    let calls = 0;

    const fetchImpl: typeof fetch = async () => {
      calls++;

      return Response.json(mrvlFixture("hero-matrix.json"));
    };

    const result = await refreshHeroMatrix({
      store,
      mrvl: createMrvlClient({ fetch: fetchImpl }),
      now: NOW,
    });

    expect(calls).toBe(0);
    expect(result).toEqual(value);
    expect(store.putCounts()[HERO_MATRIX_KEY.name]).toBeUndefined();
  });

  it("keeps the last good totals when mrvl answers 502", async () => {
    const value = await storedAt(new Date(NOW - 2 * HOUR).toISOString());
    const store = memoryKvStore({ "hero-matrix:v1": value });

    const down: MrvlClient = createMrvlClient({
      fetch: async () => new Response("Bad Gateway", { status: 502 }),
    });

    await expect(refreshHeroMatrix({ store, mrvl: down, now: NOW })).resolves.toEqual(value);
    expect(store.putCounts()[HERO_MATRIX_KEY.name]).toBeUndefined();
  });

  it("does not let a first failure throw into the sync", async () => {
    const store = memoryKvStore();

    const down: MrvlClient = createMrvlClient({
      fetch: async () => new Response("Bad Gateway", { status: 502 }),
    });

    await expect(refreshHeroMatrix({ store, mrvl: down, now: NOW })).resolves.toBeNull();
    expect(await readHeroMatrix(store)).toBeNull();
  });
});
