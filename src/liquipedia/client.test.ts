import { describe, expect, it } from "vitest";

import { liquipediaFixture } from "../../test/fixtures";
import {
  createLiquipediaClient,
  LIQUIPEDIA_USER_AGENT,
  LiquipediaApiError,
  LiquipediaHttpError,
  LiquipediaRateLimitedError,
  LiquipediaResponseError,
} from "./client";

function fakeFetch(respond: () => Response) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return respond();
  };
  return { fetchImpl, calls };
}

const json =
  (body: unknown, status = 200) =>
  () =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const noWait = async () => {};

describe("createLiquipediaClient", () => {
  it("maps recorded revisions and skips a missing page", async () => {
    const { fetchImpl } = fakeFetch(json(liquipediaFixture("revisions.json")));
    const client = createLiquipediaClient({ fetch: fetchImpl, wait: noWait });
    const revs = await client.fetchRevisions(["a", "b", "c"]);
    expect([...revs.keys()]).toEqual([
      "MR Ignite/2026/Stage 2/Americas",
      "MR Ignite/2026/Stage 2/EMEA",
    ]);
    expect(revs.get("MR Ignite/2026/Stage 2/Americas")).toEqual({
      revid: 60100,
      timestamp: "2026-10-16T22:22:40Z",
    });
  });

  it("identifies itself as Liquipedia's API terms require", async () => {
    // Bug: a missing User-Agent gets the client blocked by Liquipedia.
    const { fetchImpl, calls } = fakeFetch(json(liquipediaFixture("revisions.json")));
    await createLiquipediaClient({ fetch: fetchImpl, wait: noWait }).fetchRevisions(["a"]);
    expect(new Headers(calls[0]?.init?.headers).get("User-Agent")).toBe(LIQUIPEDIA_USER_AGENT);
    expect(calls[0]?.url).toContain("formatversion=2");
  });

  it("waits out the minimum gap between requests", async () => {
    // Bug: back-to-back requests break Liquipedia's one-request-per-2s rule.
    let clock = 1_000;
    const waits: number[] = [];
    const { fetchImpl } = fakeFetch(json(liquipediaFixture("revisions.json")));
    const client = createLiquipediaClient({
      fetch: fetchImpl,
      now: () => clock,
      minGapMs: 2_000,
      wait: async (ms) => {
        waits.push(ms);
        clock += ms;
      },
    });
    await client.fetchRevisions(["a"]);
    clock += 500;
    await client.fetchRevisions(["a"]);
    expect(waits).toEqual([1_500]);
  });

  it("splits more than 50 titles across requests", async () => {
    const { fetchImpl, calls } = fakeFetch(json(liquipediaFixture("revisions.json")));
    const titles = Array.from({ length: 51 }, (_, i) => `Page ${i}`);
    await createLiquipediaClient({ fetch: fetchImpl, wait: noWait }).fetchRevisions(titles);
    expect(calls).toHaveLength(2);
  });

  it("raises the recorded API error as a typed error", async () => {
    const { fetchImpl } = fakeFetch(json(liquipediaFixture("api-error.json")));
    const call = createLiquipediaClient({ fetch: fetchImpl, wait: noWait }).listPages("x");
    await expect(call).rejects.toBeInstanceOf(LiquipediaApiError);
    await expect(call).rejects.toMatchObject({ code: "badvalue" });
  });

  it("distinguishes rate limiting from other HTTP failures", async () => {
    const limited = fakeFetch(json({}, 429)).fetchImpl;
    const down = fakeFetch(json({}, 503)).fetchImpl;
    const rateCall = createLiquipediaClient({ fetch: limited, wait: noWait }).listPages("x");
    await expect(rateCall).rejects.toBeInstanceOf(LiquipediaRateLimitedError);
    const downCall = createLiquipediaClient({ fetch: down, wait: noWait }).listPages("x");
    await expect(downCall).rejects.toBeInstanceOf(LiquipediaHttpError);
    await expect(downCall).rejects.not.toBeInstanceOf(LiquipediaRateLimitedError);
  });

  it("rejects a response with an unexpected shape instead of trusting it", async () => {
    // Bug: a cast would let `undefined.map` crash the cron far from the cause.
    const { fetchImpl } = fakeFetch(json({ query: { allpages: "nope" } }));
    const call = createLiquipediaClient({ fetch: fetchImpl, wait: noWait }).listPages("x");
    await expect(call).rejects.toBeInstanceOf(LiquipediaResponseError);
  });
});
