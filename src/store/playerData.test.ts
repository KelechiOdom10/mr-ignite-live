import { describe, expect, it } from "vitest";

import { UidSchema } from "@/domain/player";
import { createRivalsTrackerClient } from "@/rivalstracker/client";
import {
  NotFoundError,
  RequestBudgetExceededError,
  RivalsTrackerContractError,
  UpstreamUnavailableError,
} from "@/rivalstracker/errors";

import {
  fakeRivalsTracker,
  RECORDED_MATCH,
  RECORDED_UIDS,
  type Scripted,
} from "../../test/fakeRivalsTracker";
import { memoryPlayerCache, memoryRequestLedger } from "../../test/memoryPlayerDb";
import { createPlayerData, type PlayerCache } from "./playerData";

const trqstMe = UidSchema.parse(RECORDED_UIDS.trqstMe);
const sypeh = UidSchema.parse(RECORDED_UIDS.sypeh);
const HOUR = 60 * 60 * 1000;

function setup({
  budget = 200,
  scripted = {},
  cache = memoryPlayerCache(),
}: { budget?: number; scripted?: Record<string, Scripted>; cache?: PlayerCache } = {}) {
  const fake = fakeRivalsTracker(scripted);
  const ledger = memoryRequestLedger();
  let time = Date.parse("2026-11-09T12:00:00Z");

  const data = createPlayerData({
    client: createRivalsTrackerClient({ fetch: fake.fetch }),
    cache,
    ledger,
    budget,
    now: () => time,
  });

  return { data, fake, ledger, advance: (ms: number) => (time += ms) };
}

describe("player data", () => {
  it("serves a second view of the same player from cache, so revisits cost nothing", async () => {
    const { data, fake, ledger } = setup();
    await data.get("career", { uid: trqstMe });
    await data.get("career", { uid: trqstMe });
    expect(fake.calls).toHaveLength(1);
    expect(await ledger.summary(0)).toMatchObject({ spent: 1, pending: 0 });
  });

  it("shares one request between concurrent loads of the same data", async () => {
    const { data, fake } = setup();
    await Promise.all([data.get("career", { uid: trqstMe }), data.get("career", { uid: trqstMe })]);
    expect(fake.calls).toHaveLength(1);
  });

  it("pays once for a player page, though career, history and hero cards read it", async () => {
    const { data, fake } = setup();
    await data.get("career", { uid: sypeh });
    await data.get("history", { uid: sypeh });
    await data.get("heroCareer", { uid: sypeh, heroId: 1016 });
    expect(fake.calls).toEqual(["GET /player/670067075"]);
  });

  it("reserves before calling, so concurrent calls can't jointly pass the budget", async () => {
    const { data, fake } = setup({ budget: 1 });

    const results = await Promise.allSettled([
      data.get("career", { uid: trqstMe }),
      data.get("match", { matchUid: RECORDED_MATCH }),
    ]);

    expect(fake.calls).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toMatchObject([
      { reason: expect.any(RequestBudgetExceededError) },
    ]);
  });

  it("counts the day's requests, and starts again the next UTC day", async () => {
    const { data, fake, advance } = setup({ budget: 1 });

    await data.get("career", { uid: trqstMe });
    await expect(data.get("match", { matchUid: RECORDED_MATCH })).rejects.toBeInstanceOf(
      RequestBudgetExceededError,
    );
    advance(24 * HOUR);
    await expect(data.get("match", { matchUid: RECORDED_MATCH })).resolves.toBeDefined();
    expect(fake.calls).toHaveLength(2);
  });

  it("keys a search by its name, so two names never share one answer", async () => {
    const { data, fake } = setup();

    const sypehResult = await data.get("search", { name: "Sypeh" });
    const miss = await data.get("search", { name: "zzqxnoplayer77" });

    expect(sypehResult.data[0]?.name).toBe("Sypeh");
    expect(miss.data).toEqual([]);
    expect(fake.calls).toHaveLength(2);
  });

  it("never refetches a finished match", async () => {
    const { data, fake, advance } = setup();
    await data.get("match", { matchUid: RECORDED_MATCH });
    advance(365 * 24 * HOUR);
    await data.get("match", { matchUid: RECORDED_MATCH });
    expect(fake.calls).toHaveLength(1);
  });

  it("shows an expired profile as stale until asked to refresh, so page views don't spend a request", async () => {
    const { data, fake, advance } = setup();
    await data.get("career", { uid: trqstMe });
    advance(2 * HOUR);
    const stale = await data.get("career", { uid: trqstMe });
    expect(stale.stale).toBe(true);
    expect(fake.calls).toHaveLength(1);
    const fresh = await data.get("career", { uid: trqstMe }, { refresh: true });
    expect(fresh.stale).toBe(false);
    expect(fake.calls).toHaveLength(2);
  });

  it("refetches an expired leaderboard on visit, which costs one request", async () => {
    const { data, fake, advance } = setup();
    await data.get("leaderboard", { device: "pc" });
    advance(20 * 60 * 1000);
    await data.get("leaderboard", { device: "pc" });
    expect(fake.calls).toHaveLength(2);
  });

  it("keeps showing cached data when the budget is spent", async () => {
    const { data, fake, advance } = setup({ budget: 1 });
    await data.get("career", { uid: trqstMe });
    advance(2 * HOUR);
    const kept = await data.get("career", { uid: trqstMe }, { refresh: true });
    expect(kept.stale).toBe(true);
    expect(fake.calls).toHaveLength(1);
  });

  it("still books a request when saving the response to the cache fails", async () => {
    const cache = memoryPlayerCache();

    const failing: PlayerCache = {
      get: (key) => cache.get(key),
      put: () => Promise.reject(new Error("D1 unavailable")),
    };

    const { data, ledger } = setup({ cache: failing });
    await expect(data.get("career", { uid: trqstMe })).rejects.toThrow("D1 unavailable");
    expect(await ledger.summary(0)).toMatchObject({ spent: 1, pending: 0 });
  });

  it("says when a refresh was refused, so the page doesn't claim fresh data", async () => {
    const { data, fake } = setup({ budget: 1 });
    await data.get("career", { uid: trqstMe });
    const result = await data.get("career", { uid: trqstMe }, { refresh: true });
    expect(result.refreshFailed).toBe(true);
    expect(fake.calls).toHaveLength(1);
  });

  it("remembers a missing player instead of asking on every view", async () => {
    const { data, fake } = setup();
    const missing = UidSchema.parse("999999999");

    await expect(data.get("career", { uid: missing })).rejects.toBeInstanceOf(NotFoundError);
    await expect(data.get("history", { uid: missing })).rejects.toBeInstanceOf(NotFoundError);
    expect(fake.calls).toHaveLength(1);
  });

  it("remembers a response that broke our schema instead of retrying it on every visit", async () => {
    const { data, fake } = setup({
      scripted: { [`GET /player/${trqstMe}`]: { status: 200, body: { player: {} } } },
    });

    await expect(data.get("career", { uid: trqstMe })).rejects.toBeInstanceOf(
      RivalsTrackerContractError,
    );
    await expect(data.get("career", { uid: trqstMe })).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
    expect(fake.calls).toHaveLength(1);
  });

  it("keeps the last good copy when a refresh gets a response that broke our schema", async () => {
    const scripted: Record<string, Scripted> = {};
    const { data, fake } = setup({ scripted });
    const first = await data.get("career", { uid: trqstMe });
    scripted[`GET /player/${trqstMe}`] = { status: 200, body: { player: {} } };
    const refreshed = await data.get("career", { uid: trqstMe }, { refresh: true });
    expect(refreshed.refreshFailed).toBe(true);
    expect(refreshed.data.player.info.name).toBe(first.data.player.info.name);
    const later = await data.get("career", { uid: trqstMe });
    expect(later.data.player.info.name).toBe(first.data.player.info.name);
    expect(fake.calls).toHaveLength(2);
  });

  it("serves the static hero catalogue without a request or a reservation", async () => {
    const { data, fake, ledger } = setup({ budget: 0 });

    const heroes = await data.get("heroes", {});
    expect(heroes.data.heroes).toHaveLength(56);
    expect(fake.calls).toHaveLength(0);
    expect(await ledger.summary(0)).toMatchObject({ spent: 0, pending: 0 });
  });

  it("peeks at cached data without calling RivalsTracker or spending", async () => {
    const { data, fake, ledger } = setup();
    expect(await data.peek("match", { matchUid: RECORDED_MATCH })).toBeNull();
    await data.get("match", { matchUid: RECORDED_MATCH });
    const peeked = await data.peek("match", { matchUid: RECORDED_MATCH });
    expect(peeked?.data.match_uid).toBe(RECORDED_MATCH);
    expect(fake.calls).toHaveLength(1);
    expect((await ledger.summary(0)).spent).toBe(1);
  });

  it("treats a cached entry that no longer matches the schema as missing when peeking", async () => {
    const cache = memoryPlayerCache();
    const { data } = setup({ cache });
    await cache.put(`GET /matches/${RECORDED_MATCH}`, "match", {
      status: "ok",
      body: { match_uid: RECORDED_MATCH },
      fetchedAt: 0,
      expiresAt: null,
    });
    expect(await data.peek("match", { matchUid: RECORDED_MATCH })).toBeNull();
  });
});
