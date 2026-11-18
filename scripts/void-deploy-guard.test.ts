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

function guard(reads: Read[], runWrangler?: CloudflareCommandRunner) {
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
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    publicationConfirmDelayMs: 0,
  };

  return {
    verify: () => verifyPublishedCloudflareOwner(options, candidate, predecessor),
    scripted,
    sleeps,
    trips,
  };
}

describe("verifyPublishedCloudflareOwner", () => {
  it("accepts a stale post-publish read once the candidate is confirmed at 100%", async () => {
    const { verify, scripted, trips } = guard([predecessorAt100, candidateAt100]);

    await expect(verify()).resolves.toBeNull();
    expect(scripted.calls).toEqual([deploymentsUrl, deploymentsUrl]);
    expect(trips).toEqual([]);
  });

  it("fails closed when the predecessor keeps owning traffic past the bound", async () => {
    const { verify, scripted } = guard([predecessorAt100, predecessorAt100, predecessorAt100]);

    await expect(verify()).resolves.toEqual({
      ok: false,
      reason: "deployment-changed",
      versionId: candidate,
      previousVersionId: predecessor,
      activeVersionId: predecessor,
      rollback: "not-needed",
    });
    expect(scripted.calls).toHaveLength(3);
    expect(scripted.remaining()).toBe(0);
  });

  it("fails immediately when a third version owns traffic", async () => {
    const { verify, scripted, sleeps } = guard([
      predecessorAt100,
      live({ version_id: stranger, percentage: 100 }),
    ]);

    await expect(verify()).resolves.toMatchObject({ ok: false, activeVersionId: stranger });
    expect(scripted.calls).toHaveLength(2);
    expect(sleeps).toHaveLength(1);
  });

  it("never polls when the first read already names an unknown version", async () => {
    const { verify, scripted } = guard([live({ version_id: stranger, percentage: 100 })]);

    await expect(verify()).resolves.toMatchObject({ ok: false, activeVersionId: stranger });
    expect(scripted.calls).toHaveLength(1);
  });

  it("fails on split traffic instead of reading the candidate as the owner", async () => {
    const { verify, scripted } = guard([
      predecessorAt100,
      live({ version_id: candidate, percentage: 10 }, { version_id: predecessor, percentage: 90 }),
    ]);

    await expect(verify()).resolves.toMatchObject({ ok: false, activeVersionId: null });
    expect(scripted.calls).toHaveLength(2);
  });

  it("reports an unreadable deployment as status-failed instead of assuming ownership", async () => {
    const failingCli: CloudflareCommandRunner = async () => ({
      status: 1,
      stdout: "",
      stderr: "upstream unavailable",
    });

    const { verify, scripted } = guard([unavailable], failingCli);

    await expect(verify()).resolves.toMatchObject({
      ok: false,
      reason: "status-failed",
      rollback: "unsafe",
    });
    expect(scripted.calls).toHaveLength(1);
  });
});
