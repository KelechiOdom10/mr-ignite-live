import { describe, expect, it } from "vitest";

import { collectDeployDiagnostics, deployFailureEvidence } from "./deploy-diagnostics";

const account = "ab6145b5f4d74c798229173319deaf21";
const candidate = "2e423d7c-87ff-4b2f-9d47-a003d623153a";
const predecessor = "9aeb6fc2-5ea8-4f43-ba3c-98888705f44f";
const deployment = "b993a589-d773-487f-92d9-5a8d02cc7105";
const secret = "never-retain-this-token-or-server-text";

describe("deployment failure evidence", () => {
  it("retains only known phases, reasons and UUIDs, never arbitrary log fields", () => {
    const result = deployFailureEvidence(
      [
        "not json",
        JSON.stringify({
          msg: "cloudflare_deploy_failed",
          reason: "deployment-changed",
          versionId: candidate,
          activeVersionId: candidate,
          previousVersionId: predecessor,
          err: { message: secret },
          headers: { Authorization: secret },
          token: secret,
        }),
        JSON.stringify({ msg: secret, versionId: secret }),
        JSON.stringify({ msg: "deploy_end", ok: false, error: secret }),
      ].join("\n"),
    );

    expect(result).toEqual({
      status: "failed",
      phase: "deploy_end",
      candidateVersionId: candidate,
      activeVersionId: candidate,
      previousVersionId: predecessor,
      reason: "deployment-changed",
    });
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it("does not retain unknown failure reasons or invalid version identifiers", () => {
    const result = deployFailureEvidence(
      JSON.stringify({
        msg: "cloudflare_deploy_failed",
        versionId: secret,
        reason: secret,
        activeVersionId: null,
      }),
    );

    expect(result.status).toBe("failed");
    expect(result.activeVersionId).toBeNull();
    expect(result.candidateVersionId).toBeUndefined();
    expect(result.reason).toBeUndefined();
    expect(deployFailureEvidence("").status).toBe("unavailable");
  });
});

describe("read-only Cloudflare failure diagnostics", () => {
  it("strips arbitrary fields at every response layer and never retries or writes", async () => {
    const calls: string[] = [];

    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push(String(input));
      expect(init?.method).toBe("GET");
      expect(init?.redirect).toBe("error");
      expect(new Headers(init?.headers).get("Authorization")).toBe(`Bearer ${secret}`);
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      let result;

      if (String(input).endsWith("/deployments")) {
        result = {
          deployments: [
            {
              id: deployment,
              author_email: secret,
              annotations: { secret },
              versions: [{ version_id: candidate, percentage: 100, secret }],
            },
          ],
          secret,
        };
      } else if (String(input).includes("/domains?")) {
        result = [
          {
            hostname: "rivalshub.kellycooks.dev",
            service: "rivals-hub",
            environment: "production",
            certificate: secret,
          },
        ];
      } else if (String(input).endsWith("/schedules")) {
        result = { schedules: [{ cron: "* * * * *", secret }, { cron: secret }], secret };
      } else {
        result = { enabled: true, previews_enabled: true, secret };
      }

      return Response.json({ success: true, result, errors: [{ message: secret }], secret });
    };

    const result = await collectDeployDiagnostics(account, "rivals-hub", secret, fetchImpl);
    expect(calls).toHaveLength(4);
    expect(new Set(calls).size).toBe(4);
    expect(result).toEqual({
      deployment: {
        status: "available",
        latest: { id: deployment, versions: [{ version_id: candidate, percentage: 100 }] },
      },
      domain: { status: "available", attached: true },
      cron: { status: "available", minuteCronAttached: true, count: 2 },
      visibility: { status: "available", workersDev: true, previews: true },
    });
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it("preserves split traffic percentages rather than claiming a single active version", async () => {
    const fetchImpl: typeof fetch = async () =>
      Response.json({
        success: true,
        result: {
          deployments: [
            {
              id: deployment,
              versions: [
                { version_id: candidate, percentage: 10 },
                { version_id: predecessor, percentage: 90 },
              ],
            },
          ],
        },
      });

    const result = await collectDeployDiagnostics(account, "rivals-hub", secret, fetchImpl);
    expect(result).toMatchObject({
      deployment: {
        status: "available",
        latest: {
          versions: [
            { version_id: candidate, percentage: 10 },
            { version_id: predecessor, percentage: 90 },
          ],
        },
      },
    });
  });

  it.each([401, 403, 429, 500])(
    "reports HTTP %s without retaining error bodies",
    async (status) => {
      let calls = 0;

      const fetchImpl: typeof fetch = async () => {
        calls++;

        return new Response(secret, { status });
      };

      const result = await collectDeployDiagnostics(account, "rivals-hub", secret, fetchImpl);
      expect(calls).toBe(4);
      expect(result).toMatchObject({
        deployment: {
          status: "unavailable",
          reason: status === 401 || status === 403 ? "permission-denied" : "http-error",
        },
      });
      expect(JSON.stringify(result)).not.toContain(secret);
    },
  );

  it("rejects malformed and oversized bodies without retaining them", async () => {
    const responses = [
      Response.json({
        success: true,
        result: {
          deployments: [
            {
              id: secret,
              versions: [{ version_id: candidate, percentage: 101 }],
            },
          ],
        },
      }),
      new Response("x".repeat(65_537)),
      new Response(secret),
      Response.json({ success: false, result: { enabled: true, previews_enabled: true }, secret }),
    ];

    const fetchImpl: typeof fetch = async () => {
      const response = responses.shift();

      if (!response) throw new Error(secret);

      return response;
    };

    const result = await collectDeployDiagnostics(account, "rivals-hub", secret, fetchImpl);
    expect(result).toMatchObject({
      deployment: { status: "unavailable", reason: "invalid-response" },
      domain: { status: "unavailable" },
      cron: { status: "unavailable" },
      visibility: { status: "unavailable" },
    });
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it("bounds stalled requests with one shared abort signal", async () => {
    const controller = new AbortController();

    const fetchImpl: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error(secret)));
      });

    const pending = collectDeployDiagnostics(
      account,
      "rivals-hub",
      secret,
      fetchImpl,
      controller.signal,
    );

    controller.abort();
    const result = await pending;
    expect(result).toMatchObject({
      deployment: { status: "unavailable", reason: "timeout" },
      domain: { status: "unavailable", reason: "timeout" },
      cron: { status: "unavailable", reason: "timeout" },
      visibility: { status: "unavailable", reason: "timeout" },
    });
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it("does not contact Cloudflare without credentials or with an unexpected worker", async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error("must not fetch");
    };

    await expect(
      collectDeployDiagnostics(account, "rivals-hub", undefined, fetchImpl),
    ).resolves.toEqual({ status: "unavailable", reason: "missing-token" });
    await expect(collectDeployDiagnostics(account, secret, secret, fetchImpl)).resolves.toEqual({
      status: "unavailable",
      reason: "invalid-target",
    });
  });
});
