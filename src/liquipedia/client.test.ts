import { describe, expect, it } from "vitest";

import { type Json, liquipediaFixture } from "../../test/fixtures";
import {
  createLiquipediaClient,
  LIQUIPEDIA_USER_AGENT,
  LiquipediaApiError,
  LiquipediaBudgetSpentError,
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
  (body: Json, status = 200) =>
  () =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** A fetch over a dead connection: it never settles unless its signal aborts. */
const hangingFetch: typeof fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
  });

const noWait = async () => {};
const unlimited = { maxRequests: Infinity, deadlineAt: Infinity };

/** A client on a fake clock starting at 1s, with a 2s gap; waiting advances the clock. */
function pacedClient() {
  let clock = 1_000;
  const waits: number[] = [];
  const { fetchImpl, calls } = fakeFetch(json(liquipediaFixture("revisions.json")));

  const client = createLiquipediaClient({
    fetch: fetchImpl,
    now: () => clock,
    minGapMs: 2_000,
    wait: async (ms) => {
      waits.push(ms);
      clock += ms;
    },
  });

  return {
    client,
    waits,
    calls,
    advance(ms: number) {
      clock += ms;
    },
  };
}

describe("createLiquipediaClient", () => {
  it("maps recorded revisions and skips a missing page", async () => {
    const { fetchImpl } = fakeFetch(json(liquipediaFixture("revisions.json")));
    const client = createLiquipediaClient({ fetch: fetchImpl, wait: noWait }).startRun(unlimited);
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
    const { fetchImpl, calls } = fakeFetch(json(liquipediaFixture("revisions.json")));
    await createLiquipediaClient({ fetch: fetchImpl, wait: noWait })
      .startRun(unlimited)
      .fetchRevisions(["a"]);
    expect(new Headers(calls[0]?.init?.headers).get("User-Agent")).toBe(LIQUIPEDIA_USER_AGENT);
    expect(calls[0]?.url).toContain("formatversion=2");
  });

  it("waits out the minimum gap between requests, even across runs in one isolate", async () => {
    const paced = pacedClient();
    await paced.client.startRun(unlimited).fetchRevisions(["a"]);
    paced.advance(500);
    await paced.client.startRun(unlimited).fetchRevisions(["a"]);
    expect(paced.waits).toEqual([1_500]);
  });

  it("refuses requests past a run's request budget, so one run can't keep hitting Liquipedia", async () => {
    const paced = pacedClient();
    const run = paced.client.startRun({ maxRequests: 2, deadlineAt: Infinity });
    await run.fetchRevisions(["a"]);
    await run.fetchRevisions(["a"]);
    await expect(run.fetchRevisions(["a"])).rejects.toBeInstanceOf(LiquipediaBudgetSpentError);
    expect(paced.calls).toHaveLength(2);
  });

  it("never starts a request after the run's deadline, even when the gap wait would cross it", async () => {
    const paced = pacedClient();
    const run = paced.client.startRun({ maxRequests: 10, deadlineAt: 2_500 });
    await run.fetchRevisions(["a"]);
    await expect(run.fetchRevisions(["a"])).rejects.toBeInstanceOf(LiquipediaBudgetSpentError);
    expect(paced.waits).toEqual([]);
    expect(paced.calls).toHaveLength(1);
  });

  it("splits more than 50 titles across requests", async () => {
    const { fetchImpl, calls } = fakeFetch(json(liquipediaFixture("revisions.json")));
    const titles = Array.from({ length: 51 }, (_, i) => `Page ${i}`);
    await createLiquipediaClient({ fetch: fetchImpl, wait: noWait })
      .startRun(unlimited)
      .fetchRevisions(titles);
    expect(calls).toHaveLength(2);
  });

  it("raises the recorded API error as a typed error", async () => {
    const { fetchImpl } = fakeFetch(json(liquipediaFixture("api-error.json")));

    const call = createLiquipediaClient({ fetch: fetchImpl, wait: noWait })
      .startRun(unlimited)
      .listPages("x");

    await expect(call).rejects.toBeInstanceOf(LiquipediaApiError);
    await expect(call).rejects.toMatchObject({ code: "badvalue" });
  });

  it("distinguishes rate limiting from other HTTP failures", async () => {
    const limited = fakeFetch(json({}, 429)).fetchImpl;
    const down = fakeFetch(json({}, 503)).fetchImpl;

    const rateCall = createLiquipediaClient({ fetch: limited, wait: noWait })
      .startRun(unlimited)
      .listPages("x");

    await expect(rateCall).rejects.toBeInstanceOf(LiquipediaRateLimitedError);

    const downCall = createLiquipediaClient({ fetch: down, wait: noWait })
      .startRun(unlimited)
      .listPages("x");

    await expect(downCall).rejects.toBeInstanceOf(LiquipediaHttpError);
    await expect(downCall).rejects.not.toBeInstanceOf(LiquipediaRateLimitedError);
  });

  it("rejects a response with an unexpected shape instead of trusting it", async () => {
    const { fetchImpl } = fakeFetch(json({ query: { allpages: "nope" } }));

    const call = createLiquipediaClient({ fetch: fetchImpl, wait: noWait })
      .startRun(unlimited)
      .listPages("x");

    await expect(call).rejects.toBeInstanceOf(LiquipediaResponseError);
  });

  it("gives up on a request that never answers, so a dead connection can't stall every later sync", async () => {
    const call = createLiquipediaClient({ fetch: hangingFetch, wait: noWait, timeoutMs: 20 })
      .startRun(unlimited)
      .listPages("x");

    await expect(call).rejects.toMatchObject({ name: "TimeoutError" });
  });
});
