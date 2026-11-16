import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { captureIdentity, Driver, reachable, SIZES } from "./cdp";
import { discover, surfaces } from "./surfaces";

const DEV_SERVER =
  "PLAYER_DATA_MODE=fixtures bun scripts/run-node.ts vite --port 5180 --strictPort";

const RUN_HINT = "-fold is the first viewport; -full is the whole page, capped at 9000px.";

interface Options {
  base: string;
  cdp: string;
  out: string;
  only: readonly string[] | null;
  foldOnly: boolean;
  reducedMotion: boolean;
}

function readOptions(argv: readonly string[]): Options {
  const value = (flag: string) => {
    const index = argv.indexOf(flag);

    return index === -1 ? undefined : argv[index + 1];
  };

  const only = value("--only");

  return {
    base: value("--base") ?? "http://localhost:5180",
    cdp: value("--cdp") ?? "http://127.0.0.1:9222",
    out: value("--out") ?? ".shots",
    only: only ? only.split(",").map((name) => name.trim()) : null,
    foldOnly: argv.includes("--fold-only"),
    reducedMotion: argv.includes("--reduced-motion"),
  };
}

async function main(): Promise<void> {
  const options = readOptions(process.argv.slice(2));
  const base = options.base.replace(/\/$/, "");
  const index = await fetch(`${base}/matches`).catch(() => null);

  if (!index?.ok) {
    console.error(
      `Nothing is serving ${base}. Start the dev server first, then run this again:\n  ${DEV_SERVER}`,
    );
    process.exitCode = 1;

    return;
  }

  if (!(await reachable(options.cdp + "/json/version"))) {
    console.error("Start headless Chrome with CDP first; see docs/design-review.md");
    process.exitCode = 1;

    return;
  }

  const driver = await Driver.open(options.cdp, options.reducedMotion);
  const folder = resolve(options.out);

  mkdirSync(folder, { recursive: true });

  const written: string[] = [];

  const warnings: string[] = [];
  const captured: { surface: string; url: string; size: string; hydrated: boolean }[] = [];

  try {
    const found = await discover(driver, base);

    const wanted = surfaces(found).filter(
      (surface) => !options.only || options.only.includes(surface.name),
    );

    if (wanted.length === 0) throw new Error("No surfaces matched --only");

    for (const size of SIZES) {
      await driver.resize(size);

      for (const surface of wanted) {
        const started = Date.now();

        driver.resetProblems();

        const hydrated = await driver.visit(`${base}${surface.path}`);

        if (!hydrated) warnings.push(`${surface.name} at ${size.label}: never hydrated within 20s`);

        if (surface.prepare) await surface.prepare(driver);

        const probe = await driver.probe();

        if (probe.scrollWidth > probe.innerWidth) {
          warnings.push(
            `${surface.name} at ${size.label}: page is ${probe.scrollWidth}px wide in a ${probe.innerWidth}px viewport`,
          );
        }

        const stem = join(folder, `${surface.name}-${size.label}`);
        const fold = `${stem}-fold.png`;

        writeFileSync(fold, await driver.capture(false));
        written.push(fold);

        if (!options.foldOnly) {
          const full = `${stem}-full.png`;

          writeFileSync(full, await driver.capture(true));
          written.push(full);
        }

        captured.push({
          surface: surface.name,
          url: `${base}${surface.path}`,
          size: size.label,
          hydrated,
        });

        for (const problem of new Set(driver.problems())) {
          warnings.push(`${surface.name} at ${size.label}: ${problem}`);
        }

        console.info(`  captured ${surface.name} at ${size.label} in ${Date.now() - started}ms`);
      }
    }
  } finally {
    await driver.close();
  }

  writeFileSync(
    join(folder, "captures.json"),
    JSON.stringify({ ...captureIdentity(base), captured, written, warnings }, null, 2),
  );

  console.info(`${written.length} screenshots in ${folder}`);
  console.info(written.map((path) => `  ${path}`).join("\n"));

  if (warnings.length > 0) {
    console.warn(`\n${warnings.length} problem(s) seen while capturing:`);
    console.warn(warnings.map((line) => `  ${line}`).join("\n"));
  }

  console.info(`\n${RUN_HINT}`);
}

await main();
