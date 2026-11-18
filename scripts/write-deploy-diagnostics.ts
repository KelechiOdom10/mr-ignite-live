import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { z } from "zod";

import { collectDeployDiagnostics, deployFailureEvidence } from "./deploy-diagnostics";

const targetSchema = z.object({
  resolved: z.object({ account_id: z.string(), name: z.string() }),
});

const output = process.argv[2];

if (!output) throw new Error("Provide a diagnostic output directory");

let attempt = deployFailureEvidence("");

try {
  const directory = join(homedir(), ".void", "logs");

  const files = (await readdir(directory))
    .filter((file) => /^deploy-[\w.-]+\.jsonl$/.test(file))
    .sort();

  const latest = files.at(-1);

  if (latest) {
    const path = join(directory, latest);

    if ((await stat(path)).size <= 2_000_000)
      attempt = deployFailureEvidence(await readFile(path, "utf8"));
  }
} catch {
  attempt = deployFailureEvidence("");
}

let remote;

try {
  const target = targetSchema.parse(JSON.parse(await readFile("void.lock.json", "utf8"))).resolved;
  remote = await collectDeployDiagnostics(
    target.account_id,
    target.name,
    process.env.CLOUDFLARE_API_TOKEN,
  );
} catch {
  remote = { status: "unavailable", reason: "invalid-target" };
}

await mkdir(output, { recursive: true });

await writeFile(
  join(output, "deployment.json"),
  JSON.stringify(
    {
      schema: 1,
      purpose: "Post-failure observation only; not evidence of historical deployment-read contents",
      attempt,
      remote,
    },
    null,
    2,
  ) + "\n",
  { mode: 0o600 },
);
