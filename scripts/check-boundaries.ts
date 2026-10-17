import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { findViolations, type SourceFile } from "./boundaries";

const SKIP = new Set(["node_modules", "dist"]);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name) || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (/\.tsx?$/.test(entry.name)) yield path;
  }
}

const files: SourceFile[] = [...walk(".")].map((path) => ({
  path,
  source: readFileSync(path, "utf8"),
}));
const violations = findViolations(files);

if (violations.length > 0) {
  console.error(violations.join("\n"));
  console.error(
    `\n${violations.length} boundary violation(s). See the Architecture table in AGENTS.md.`,
  );
  process.exit(1);
}
console.info(`Boundaries hold across ${files.length} files.`);
