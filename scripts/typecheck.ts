import { spawnSync } from "node:child_process";

// beUI files are copied verbatim from its registry, so they're held to plain `strict`
// (tsconfig.vendor.json) instead of the app's stricter flags.
const VENDORED = /^src\/(components\/motion|lib)\//;

function tsc(project: string): string {
  const run = spawnSync("bunx", ["tsc", "--noEmit", "--pretty", "false", "-p", project], {
    encoding: "utf8",
  });
  return run.stdout + run.stderr;
}

const appErrors = tsc("tsconfig.json")
  .split("\n")
  .filter((line) => /error TS\d+/.test(line) && !VENDORED.test(line));
const vendorErrors = tsc("tsconfig.vendor.json")
  .split("\n")
  .filter((line) => /error TS\d+/.test(line));

const errors = [...appErrors, ...vendorErrors];
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
