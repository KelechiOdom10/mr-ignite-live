// Records RivalsIsland responses as fixtures. Spends real credits.
// Usage: bun scripts/record-rivalsisland.ts --max-credits 60 name:cost=/path [name:cost=/path ...]
// Reads RIVALSISLAND_API_KEY from .env (bun loads it). Writes body and headers of the same response.
import { writeFileSync } from "node:fs";

const ORIGIN = "https://api.rivalsisland.com";
const USER_AGENT =
  "RivalsHub/0.1 (personal Marvel Rivals site; contact via github.com/KelechiOdom10)";
const OUT = new URL("../test/fixtures/rivalsisland/", import.meta.url);

const args = process.argv.slice(2);
const maxIndex = args.indexOf("--max-credits");
const maxCredits = Number(args[maxIndex + 1]);
if (maxIndex === -1 || !Number.isInteger(maxCredits) || maxCredits <= 0) {
  throw new Error("Pass --max-credits <n> to cap what this run may spend");
}
const requests = args
  .filter((_, i) => i !== maxIndex && i !== maxIndex + 1)
  .map((pair) => {
    const match = /^([\w-]+):(\d+)=(\/.*)$/s.exec(pair);
    if (!match?.[1] || !match[2] || !match[3]) {
      throw new Error(`Expected name:cost=/path (cost from the API price list), got ${pair}`);
    }
    return { name: match[1], expected: Number(match[2]), path: match[3] };
  });

const apiKey = process.env.RIVALSISLAND_API_KEY;
if (!apiKey) throw new Error("RIVALSISLAND_API_KEY is not set in .env");

let spent = 0;
for (const { name, expected, path } of requests) {
  if (spent + expected > maxCredits) {
    console.info(
      `Stopping before ${name}: it would take this run past --max-credits ${maxCredits}`,
    );
    break;
  }
  const res = await fetch(ORIGIN + path, {
    headers: { "x-api-key": apiKey, "User-Agent": USER_AGENT },
  });
  const body = await res.text();
  const headerLines = [`HTTP ${res.status}`, ...[...res.headers].map(([k, v]) => `${k}: ${v}`)];
  writeFileSync(new URL(`${name}.json`, OUT), body);
  writeFileSync(new URL(`${name}.headers`, OUT), `${headerLines.join("\n")}\n`);
  const header = res.headers.get("x-credit-cost");
  const cost = header === null ? Number.NaN : Number(header);
  spent += cost;
  console.info(
    `${name} ${res.status} cost=${res.headers.get("x-credit-cost")} balance=${res.headers.get("x-credit-balance")} run_total=${spent}`,
  );
  if (!Number.isFinite(cost) || cost > expected) {
    console.error(
      `Stopping: ${name} cost ${header ?? "an unknown amount"}, expected at most ${expected}`,
    );
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
