import { describe, expect, it } from "vitest";

import { UidSchema } from "@/domain/player";
import { createRivalsIslandClient } from "@/rivalsisland/client";
import {
  CreditBudgetExceededError,
  MatchHistoryPrivateError,
  RivalsIslandContractError,
  UpstreamUnavailableError,
} from "@/rivalsisland/errors";

import {
  fakeRivalsIsland,
  RECORDED_MATCH,
  RECORDED_UIDS,
  rivalsIslandFixture,
  type Scripted,
} from "../../test/fakeRivalsIsland";
import { memoryCreditLedger, memoryPlayerCache } from "../../test/memoryPlayerDb";
import { createPlayerData, type PlayerCache } from "./playerData";

const trqstMe = UidSchema.parse(RECORDED_UIDS.trqstMe);
const sypeh = UidSchema.parse(RECORDED_UIDS.sypeh);
const HOUR = 60 * 60 * 1000;

function setup({
  budget = 200,
  scripted = {},
  cache = memoryPlayerCache(),
}: { budget?: number; scripted?: Record<string, Scripted>; cache?: PlayerCache } = {}) {
  const fake = fakeRivalsIsland(scripted);
  const ledger = memoryCreditLedger();
  let time = Date.parse("2026-10-17T12:00:00Z");
  const data = createPlayerData({
    client: createRivalsIslandClient({ apiKey: "k", fetch: fake.fetch }),
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
    expect(await ledger.summary()).toMatchObject({ spent: 10, pending: 0 });
  });

  it("shares one request between concurrent loads of the same data", async () => {
    const { data, fake } = setup();
    await Promise.all([data.get("career", { uid: trqstMe }), data.get("career", { uid: trqstMe })]);
    expect(fake.calls).toHaveLength(1);
  });

  it("reserves credits before calling, so concurrent calls can't jointly pass the budget", async () => {
    const { data, fake } = setup({ budget: 15 });
    const results = await Promise.allSettled([
      data.get("career", { uid: trqstMe }),
      data.get("heroCareer", { uid: sypeh, heroId: 1011 }),
    ]);
    expect(fake.calls).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toMatchObject([
      { reason: expect.any(CreditBudgetExceededError) },
    ]);
  });

  it("books the credits RivalsIsland charged, not the price we expected", async () => {
    const path = `/players/${trqstMe}/career`;
    const { data, ledger } = setup({
      scripted: {
        [path]: {
          status: 200,
          cost: 7,
          body: rivalsIslandFixture("player-career"),
        },
      },
    });
    await data.get("career", { uid: trqstMe });
    expect((await ledger.summary()).spent).toBe(7);
  });

  it("remembers a private history for a while at no cost, instead of asking again on every view", async () => {
    const { data, fake, ledger } = setup();
    const params = { uid: trqstMe, page: 0, category: 2 };
    await expect(data.get("history", params)).rejects.toBeInstanceOf(MatchHistoryPrivateError);
    await expect(data.get("history", params)).rejects.toBeInstanceOf(MatchHistoryPrivateError);
    expect(fake.calls).toHaveLength(1);
    expect(await ledger.summary()).toMatchObject({ spent: 0, pending: 0 });
  });

  it("never refetches a finished match", async () => {
    const { data, fake, advance } = setup();
    await data.get("match", { matchUid: RECORDED_MATCH });
    advance(365 * 24 * HOUR);
    await data.get("match", { matchUid: RECORDED_MATCH });
    expect(fake.calls).toHaveLength(1);
  });

  it("shows an expired career as stale until asked to refresh, so page views don't spend credits", async () => {
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

  it("refetches an expired leaderboard on visit, which costs one credit", async () => {
    const { data, fake, advance } = setup();
    await data.get("leaderboard", { device: "pc" });
    advance(10 * 60 * 1000);
    await data.get("leaderboard", { device: "pc" });
    expect(fake.calls).toHaveLength(2);
  });

  it("keeps showing cached data when the budget is spent", async () => {
    const { data, fake, advance } = setup({ budget: 10 });
    await data.get("career", { uid: trqstMe });
    advance(2 * HOUR);
    const kept = await data.get("career", { uid: trqstMe }, { refresh: true });
    expect(kept.stale).toBe(true);
    expect(fake.calls).toHaveLength(1);
  });

  it("still books a paid call when saving it to the cache fails", async () => {
    const cache = memoryPlayerCache();
    const failing: PlayerCache = {
      get: (key) => cache.get(key),
      put: () => Promise.reject(new Error("D1 unavailable")),
    };
    const { data, ledger } = setup({ cache: failing });
    await expect(data.get("career", { uid: trqstMe })).rejects.toThrow("D1 unavailable");
    expect(await ledger.summary()).toMatchObject({ spent: 10, pending: 0 });
  });

  it("says when a paid refresh was refused, so the page doesn't claim fresh data", async () => {
    const { data, fake } = setup({ budget: 10 });
    await data.get("career", { uid: trqstMe });
    const result = await data.get("career", { uid: trqstMe }, { refresh: true });
    expect(result.refreshFailed).toBe(true);
    expect(fake.calls).toHaveLength(1);
  });

  it("remembers a response that broke our schema instead of paying for it on every visit", async () => {
    const path = `/players/${trqstMe}/career`;
    const { data, fake } = setup({
      scripted: { [path]: { status: 200, cost: 10, body: { player: {} } } },
    });
    await expect(data.get("career", { uid: trqstMe })).rejects.toBeInstanceOf(
      RivalsIslandContractError,
    );
    await expect(data.get("career", { uid: trqstMe })).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
    expect(fake.calls).toHaveLength(1);
  });

  it("keeps the last good copy when a refresh gets a response that broke our schema", async () => {
    const path = `/players/${trqstMe}/career`;
    const scripted: Record<string, Scripted> = {};
    const { data, fake } = setup({ scripted });
    const first = await data.get("career", { uid: trqstMe });
    scripted[path] = { status: 200, cost: 10, body: { player: {} } };
    const refreshed = await data.get("career", { uid: trqstMe }, { refresh: true });
    expect(refreshed.refreshFailed).toBe(true);
    expect(refreshed.data.player.name).toBe(first.data.player.name);
    const later = await data.get("career", { uid: trqstMe });
    expect(later.data.player.name).toBe(first.data.player.name);
    expect(fake.calls).toHaveLength(2);
  });

  it("peeks at cached data without calling RivalsIsland or spending", async () => {
    const { data, fake, ledger } = setup();
    expect(await data.peek("match", { matchUid: RECORDED_MATCH })).toBeNull();
    await data.get("match", { matchUid: RECORDED_MATCH });
    const peeked = await data.peek("match", { matchUid: RECORDED_MATCH });
    expect(peeked?.data.match_uid).toBe(RECORDED_MATCH);
    expect(fake.calls).toHaveLength(1);
    expect((await ledger.summary()).spent).toBe(5);
  });

  it("treats a cached entry that no longer matches the schema as missing when peeking", async () => {
    const cache = memoryPlayerCache();
    const { data } = setup({ cache });
    await cache.put(`match:/matches/${RECORDED_MATCH}`, "match", {
      status: "ok",
      body: { match_uid: RECORDED_MATCH },
      fetchedAt: 0,
      expiresAt: null,
    });
    expect(await data.peek("match", { matchUid: RECORDED_MATCH })).toBeNull();
  });
});
