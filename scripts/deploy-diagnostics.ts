import { z } from "zod";

const uuid = z.string().uuid();

const traffic = z.object({
  version_id: uuid,
  percentage: z.number().finite().min(0).max(100),
});

const deploymentSchema = z.object({
  deployments: z.array(z.object({ id: uuid, versions: z.array(traffic).max(20) })).max(100),
});

const domainsSchema = z
  .array(
    z.object({
      hostname: z.string(),
      service: z.string(),
      environment: z.string(),
      enabled: z.boolean().optional(),
    }),
  )
  .max(100);

const schedulesSchema = z.object({ schedules: z.array(z.object({ cron: z.string() })).max(100) });
const visibilitySchema = z.object({ enabled: z.boolean(), previews_enabled: z.boolean() });
const envelope = z.object({ success: z.literal(true), result: z.unknown() });

const logEvent = z.object({
  msg: z.enum([
    "deploy_start",
    "cloudflare_deploy_start",
    "cloudflare_deploy_failed",
    "deploy_end",
  ]),
  ok: z.boolean().optional(),
  versionId: uuid.optional().catch(undefined),
  activeVersionId: uuid.nullable().optional().catch(undefined),
  previousVersionId: uuid.nullable().optional().catch(undefined),
  reason: z
    .enum([
      "deployment-changed",
      "status-failed",
      "triggers-failed",
      "atomic-failed",
      "atomic-output-invalid",
      "atomic-readiness-failed",
      "atomic-readiness-access-denied",
      "readiness-failed",
      "readiness-staging-failed",
      "upload-failed",
      "activation-failed",
      "inheritance-source-changed",
      "inheritance-source-unavailable",
      "traffic-split-unsupported",
      "traffic-preservation-unavailable",
      "uploader-changed",
    ])
    .optional()
    .catch(undefined),
});

export function deployFailureEvidence(log: string) {
  let phase: z.infer<typeof logEvent>["msg"] | undefined;
  let failure: z.infer<typeof logEvent> | undefined;

  for (const line of log.split("\n")) {
    try {
      const parsed = logEvent.safeParse(JSON.parse(line));

      if (!parsed.success) continue;
      phase = parsed.data.msg;

      if (parsed.data.msg === "cloudflare_deploy_failed") failure = parsed.data;
    } catch {
      continue;
    }
  }

  return {
    status: failure ? "failed" : "unavailable",
    phase,
    candidateVersionId: failure?.versionId,
    activeVersionId: failure?.activeVersionId,
    previousVersionId: failure?.previousVersionId,
    reason: failure?.reason,
  };
}

async function boundedJson(response: Response) {
  const reader = response.body?.getReader();

  if (!reader) throw new Error("empty-response");
  const chunks: Uint8Array[] = [];
  let bytes = 0;

  try {
    for (;;) {
      const chunk = await reader.read();

      if (chunk.done) break;
      bytes += chunk.value.byteLength;

      if (bytes > 65_536) throw new Error("response-too-large");
      chunks.push(chunk.value);
    }
  } finally {
    await reader.cancel();
  }

  return envelope.parse(JSON.parse(Buffer.concat(chunks).toString("utf8"))).result;
}

async function readMetadata<T>(
  path: string,
  schema: z.ZodType<T>,
  token: string,
  signal: AbortSignal,
  fetchImpl: typeof fetch,
) {
  try {
    const response = await fetchImpl(`https://api.cloudflare.com/client/v4${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      redirect: "error",
      signal,
    });

    if (!response.ok) {
      await response.body?.cancel();

      return {
        status: "unavailable",
        reason:
          response.status === 401 || response.status === 403 ? "permission-denied" : "http-error",
      } as const;
    }

    const parsed = schema.safeParse(await boundedJson(response));

    return parsed.success
      ? ({ status: "available", data: parsed.data } as const)
      : ({ status: "unavailable", reason: "invalid-response" } as const);
  } catch {
    return {
      status: "unavailable",
      reason: signal.aborted ? "timeout" : "request-failed",
    } as const;
  }
}

export async function collectDeployDiagnostics(
  accountId: string,
  workerName: string,
  token: string | undefined,
  fetchImpl: typeof fetch = fetch,
  signal: AbortSignal = AbortSignal.timeout(8_000),
) {
  if (!token) return { status: "unavailable", reason: "missing-token" } as const;

  if (!/^[a-f0-9]{32}$/.test(accountId) || workerName !== "rivals-hub") {
    return { status: "unavailable", reason: "invalid-target" } as const;
  }

  const account = `/accounts/${accountId}/workers`;
  const script = `${account}/scripts/${workerName}`;

  const [deployment, domains, schedules, visibility] = await Promise.all([
    readMetadata(`${script}/deployments`, deploymentSchema, token, signal, fetchImpl),
    readMetadata(
      `${account}/domains?service=${workerName}&hostname=rivalshub.kellycooks.dev`,
      domainsSchema,
      token,
      signal,
      fetchImpl,
    ),
    readMetadata(`${script}/schedules`, schedulesSchema, token, signal, fetchImpl),
    readMetadata(`${script}/subdomain`, visibilitySchema, token, signal, fetchImpl),
  ]);

  return {
    deployment:
      deployment.status === "available"
        ? { status: "available", latest: deployment.data.deployments[0] ?? null }
        : deployment,
    domain:
      domains.status === "available"
        ? {
            status: "available",
            attached: domains.data.some(
              (domain) =>
                domain.hostname === "rivalshub.kellycooks.dev" &&
                domain.service === workerName &&
                domain.environment === "production" &&
                domain.enabled !== false,
            ),
          }
        : domains,
    cron:
      schedules.status === "available"
        ? {
            status: "available",
            minuteCronAttached: schedules.data.schedules.some(
              (schedule) => schedule.cron === "* * * * *",
            ),
            count: schedules.data.schedules.length,
          }
        : schedules,
    visibility:
      visibility.status === "available"
        ? {
            status: "available",
            workersDev: visibility.data.enabled,
            previews: visibility.data.previews_enabled,
          }
        : visibility,
  };
}
