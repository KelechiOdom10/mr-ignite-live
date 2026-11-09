// Records RivalsTracker responses as fixtures, byte-for-byte, with their headers.
// Usage: bun scripts/record-rivalstracker.ts manifest.json
// Manifest: [{ name, method: "GET" | "POST", path, body? }]
// Public, unauthenticated website endpoints; no key and no cookies. Keep the run small.
import { readFileSync, writeFileSync } from "node:fs";

const ORIGIN = "https://api.rivalstracker.com/api";

const USER_AGENT = "RivalsHub/1.0 (personal, non-commercial)";

const OUT = new URL("../test/fixtures/rivalstracker/", import.meta.url);

interface Request {
  name: string;
  method: "GET" | "POST";
  path: string;
  body?: unknown;
}

const manifestPath = process.argv[2];

if (!manifestPath) throw new Error("Pass the path to a JSON manifest");

const requests: Request[] = JSON.parse(readFileSync(manifestPath, "utf8"));

if (requests.length > 15) throw new Error("Keep a run to at most 15 requests");

for (const request of requests) {
  const payload = request.body === undefined ? null : JSON.stringify(request.body);

  const init: RequestInit = {
    method: request.method,
    headers:
      payload === null
        ? { "User-Agent": USER_AGENT }
        : { "User-Agent": USER_AGENT, "Content-Type": "application/json" },
  };

  if (payload !== null) init.body = payload;

  const res = await fetch(ORIGIN + request.path, init);

  const body = await res.text();
  const headerLines = [`HTTP ${res.status}`, ...[...res.headers].map(([k, v]) => `${k}: ${v}`)];
  writeFileSync(new URL(`${request.name}.json`, OUT), body);
  writeFileSync(new URL(`${request.name}.headers`, OUT), `${headerLines.join("\n")}\n`);
  console.info(`${request.name} ${request.method} ${request.path} ${res.status} ${body.length}B`);

  await new Promise((resolve) => setTimeout(resolve, 1000));
}
