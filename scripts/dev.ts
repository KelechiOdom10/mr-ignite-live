import { spawn, spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const VITE_NODE_FLOOR: readonly [number, number] = [22, 12];

type Runtime = { path: string; version: string };

function parse(version: string): number[] {
  return version.replace(/^v/, "").split(".").map(Number);
}

function compare(a: string, b: string): number {
  const left = parse(a);
  const right = parse(b);

  for (let index = 0; index < 3; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);

    if (difference !== 0) return difference;
  }

  return 0;
}

function supported(version: string): boolean {
  const [major = 0, minor = 0] = parse(version);

  return (
    major > VITE_NODE_FLOOR[0] || (major === VITE_NODE_FLOOR[0] && minor >= VITE_NODE_FLOOR[1])
  );
}

// bun shims `node` to itself when none is installed, so a candidate has to be asked.
function usable(path: string): Runtime | undefined {
  const run = spawnSync(path, ["-p", "process.versions.bun ? 'bun' : process.versions.node"], {
    encoding: "utf8",
  });

  const version = run.stdout?.trim();

  return run.status === 0 && version && version !== "bun" && supported(version)
    ? { path, version }
    : undefined;
}

function candidates(): string[] {
  const nvm = process.env.NVM_DIR ?? join(homedir(), ".nvm");
  let installed: string[] = [];

  try {
    installed = readdirSync(join(nvm, "versions", "node"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => compare(b, a))
      .map((name) => join(nvm, "versions", "node", name, "bin", "node"));
  } catch {
    installed = [];
  }

  return [process.env.NODE, "node", ...installed].filter((path): path is string => Boolean(path));
}

const runtime = candidates()
  .map(usable)
  .find((found): found is Runtime => Boolean(found));

if (!runtime) {
  console.error(
    [
      `The dev server runs Vite under Node ${VITE_NODE_FLOOR.join(".")} or newer: bun cannot run void's Cloudflare config migration ("cf could not translate the built Cloudflare configuration").`,
      "No suitable Node found in $NODE, on PATH, or under ~/.nvm/versions/node.",
      "Install it (nvm install 24) or point NODE at a Node binary, then run this again.",
    ].join("\n"),
  );
  process.exit(1);
}

console.info(`Dev server on ${runtime.version} (${runtime.path})`);

const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const child = spawn(runtime.path, [vite, ...process.argv.slice(2)], { stdio: "inherit" });

child.on("exit", (code, signal) => {
  process.exit(signal ? 1 : (code ?? 0));
});
