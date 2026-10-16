import { spawnSync } from "node:child_process";

const COPIED_FROM_BEUI = /^src\/(components|lib)\//;

function tsc(project: string): string {
  const run = spawnSync("bunx", ["tsc", "--noEmit", "--pretty", "false", "-p", project], {
    encoding: "utf8",
  });
  return run.stdout + run.stderr;
}

const appErrors = tsc("tsconfig.json")
  .split("\n")
  .filter((line) => /error TS\d+/.test(line) && !COPIED_FROM_BEUI.test(line));
const vendorErrors = tsc("tsconfig.vendor.json")
  .split("\n")
  .filter((line) => /error TS\d+/.test(line));

const errors = [...appErrors, ...vendorErrors];
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
