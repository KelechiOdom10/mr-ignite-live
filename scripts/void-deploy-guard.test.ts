import { readFileSync } from "node:fs";

import {
  createCloudflareMetadataRunner,
  verifyPublishedCloudflareOwner,
  type CloudflareCommandRunner,
  type CloudflareVersionActivationOptions,
} from "@void/deploy-cloudflare";
import { describe, expect, it } from "vitest";

const candidate = "2e423d7c-87ff-4b2f-9d47-a003d623153a";
const predecessor = "9aeb6fc2-5ea8-4f43-ba3c-98888705f44f";
const stranger = "c4c6dfcd-a4e0-4b07-8f94-7de07f1def30";

const deploymentsUrl =
  "https://api.cloudflare.com/client/v4/accounts/ab6145b5f4d74c798229173319deaf21/workers/scripts/rivals-hub/deployments";

type Traffic = { version_id: string; percentage: number };

type Read = { status: number; versions?: undefined } | { status: 200; versions: Traffic[] };

const live = (...versions: Traffic[]): Read => ({ status: 200, versions });
const unavailable: Read = { status: 500 };
const candidateAt100 = live({ version_id: candidate, percentage: 100 });
const predecessorAt100 = live({ version_id: predecessor, percentage: 100 });

/** Reads the predecessor `count` times before the candidate takes over, as Cloudflare's lag does. */
const staleThenCandidate = (count: number): Read[] => [
  ...Array.from({ length: count }, () => predecessorAt100),
  candidateAt100,
];

function scriptedFetch(reads: Read[]) {
  const calls: string[] = [];

  const fetchImpl: typeof fetch = async (input) => {
    calls.push(String(input));

    const next = reads.shift();

    if (!next) throw new Error("The guard read more often than the scenario allows.");

    if (next.status !== 200) return new Response("upstream error", { status: next.status });

    return Response.json({ success: true, result: { deployments: [{ versions: next.versions }] } });
  };

  return { fetchImpl, calls, remaining: () => reads.length };
}

/** A read the HTTP boundary cannot serve falls back to the CLI; these scenarios must not need it. */
function guardedCli(trips: string[]): CloudflareCommandRunner {
  return async (operation) => {
    trips.push(operation.type);
    throw new Error("The guards under test must not call the Cloudflare CLI.");
  };
}

type ConfirmBounds = {
  attempts?: number;
  intervalMs?: number;
  timeoutMs?: number;
  withoutSleep?: boolean;
};

function guard(reads: Read[], bounds: ConfirmBounds = {}, runWrangler?: CloudflareCommandRunner) {
  const scripted = scriptedFetch(reads);
  const sleeps: number[] = [];
  const trips: string[] = [];

  const options: CloudflareVersionActivationOptions = {
    runWrangler: createCloudflareMetadataRunner({
      runWrangler: runWrangler ?? guardedCli(trips),
      accountId: "ab6145b5f4d74c798229173319deaf21",
      apiBaseUrl: "https://api.cloudflare.com/client/v4",
      workerName: "rivals-hub",
      getToken: async () => "session-token",
      verifyUploader: () => true,
      fetch: scripted.fetchImpl,
      env: {},
    }),
    verifyUploader: () => true,
    workerName: "rivals-hub",
    message: "test",
  };

  if (!bounds.withoutSleep)
    options.sleep = async (ms) => {
      sleeps.push(ms);
    };

  if (bounds.attempts !== undefined) options.publicationConfirmAttempts = bounds.attempts;

  if (bounds.intervalMs !== undefined) options.publicationConfirmIntervalMs = bounds.intervalMs;

  if (bounds.timeoutMs !== undefined) options.publicationConfirmTimeoutMs = bounds.timeoutMs;

  return {
    verify: () => verifyPublishedCloudflareOwner(options, candidate, predecessor),
    scripted,
    sleeps,
    trips,
  };
}

describe("verifyPublishedCloudflareOwner", () => {
  it("accepts a stale post-publish read once the candidate is confirmed at 100%", async () => {
    const run = guard(staleThenCandidate(1));

    await expect(run.verify()).resolves.toBeNull();
    expect(run.scripted.calls).toEqual([deploymentsUrl, deploymentsUrl]);
    expect(run.trips).toEqual([]);
  });

  it("fails closed when the predecessor keeps owning traffic past the bound", async () => {
    const run = guard([predecessorAt100, predecessorAt100, predecessorAt100], { attempts: 3 });

    await expect(run.verify()).resolves.toEqual({
      ok: false,
      reason: "deployment-changed",
      versionId: candidate,
      previousVersionId: predecessor,
      activeVersionId: predecessor,
      rollback: "not-needed",
    });
    expect(run.scripted.calls).toHaveLength(3);
    expect(run.scripted.remaining()).toBe(0);
  });

  it("fails immediately when a third version owns traffic", async () => {
    const run = guard([predecessorAt100, live({ version_id: stranger, percentage: 100 })]);

    await expect(run.verify()).resolves.toMatchObject({ ok: false, activeVersionId: stranger });
    expect(run.scripted.calls).toHaveLength(2);
  });

  it("never polls when the first read already names an unknown version", async () => {
    const run = guard([live({ version_id: stranger, percentage: 100 })]);

    await expect(run.verify()).resolves.toMatchObject({ ok: false, activeVersionId: stranger });
    expect(run.scripted.calls).toHaveLength(1);
  });

  it("fails on split traffic instead of reading the candidate as the owner", async () => {
    const run = guard([
      predecessorAt100,
      live({ version_id: candidate, percentage: 10 }, { version_id: predecessor, percentage: 90 }),
    ]);

    await expect(run.verify()).resolves.toMatchObject({ ok: false, activeVersionId: null });
    expect(run.scripted.calls).toHaveLength(2);
  });

  it("reports an unreadable deployment as status-failed instead of assuming ownership", async () => {
    const failingCli: CloudflareCommandRunner = async () => ({
      status: 1,
      stdout: "",
      stderr: "upstream unavailable",
    });

    const run = guard([unavailable], {}, failingCli);

    await expect(run.verify()).resolves.toMatchObject({
      ok: false,
      reason: "status-failed",
      rollback: "unsafe",
    });
    expect(run.scripted.calls).toHaveLength(1);
  });

  it("tolerates a stale read that outlasts the old three-read bound", async () => {
    const run = guard(staleThenCandidate(8));

    await expect(run.verify()).resolves.toBeNull();
    expect(run.scripted.calls).toHaveLength(9);
  });

  it("stops at its wall-clock budget even when reads keep naming the predecessor", async () => {
    const run = guard(
      Array.from({ length: 10 }, () => predecessorAt100),
      { attempts: 60, intervalMs: 5, timeoutMs: 12 },
    );

    await expect(run.verify()).resolves.toMatchObject({ ok: false, activeVersionId: predecessor });
    expect(run.scripted.calls.length).toBeLessThan(10);
  });
});

describe("verifyPublishedCloudflareOwner with the real pause", () => {
  it("waits on its own timer and succeeds when no sleep is injected", async () => {
    const run = guard(staleThenCandidate(1), { intervalMs: 1, withoutSleep: true });

    await expect(run.verify()).resolves.toBeNull();
    expect(run.scripted.calls).toHaveLength(2);
    expect(run.trips).toEqual([]);
  });

  it("waits through a stale window that lasts several seconds of reads", async () => {
    const run = guard(staleThenCandidate(6), { intervalMs: 1, withoutSleep: true });

    await expect(run.verify()).resolves.toBeNull();
    expect(run.scripted.calls).toHaveLength(7);
  });
});

describe("the patched bundle", () => {
  it("keeps every post-publish ownership check on the tolerant confirmation", () => {
    const bundle = readFileSync("node_modules/@void/deploy-cloudflare/dist/index.mjs", "utf8");

    expect(bundle).toContain("const verifyPublishedOwner = () => verifyPublishedCloudflareOwner(");
    expect(bundle).toContain(
      "const confirmedOwner = await verifyPublishedCloudflareOwner(options, versionId, previousVersionId);",
    );
    expect(bundle).toContain(
      "const ownerAfterReadinessFailure = await verifyPublishedCloudflareOwner(",
    );
  });
});
