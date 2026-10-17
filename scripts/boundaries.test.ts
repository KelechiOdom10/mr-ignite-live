import { describe, expect, it } from "vitest";

import { findViolations } from "./boundaries";

describe("findViolations", () => {
  it("rejects a view reaching into the store, so server-only code can't leak into the browser", () => {
    const violations = findViolations([
      { path: "src/ui/MatchCard.tsx", source: `import { syncOnce } from "@/store/run";` },
    ]);
    expect(violations).toEqual([
      `src/ui/MatchCard.tsx: imports "@/store/run", which ui may not use`,
    ]);
  });

  it("catches the same reach through a relative path", () => {
    const violations = findViolations([
      { path: "src/ui/MatchCard.tsx", source: `import { syncOnce } from "../store/run";` },
    ]);
    expect(violations).toEqual([
      `src/ui/MatchCard.tsx: imports "../store/run", which ui may not use`,
    ]);
  });

  it("flags a new folder that has no rule instead of letting it import anything", () => {
    const violations = findViolations([
      { path: "src/marvelrivalsapi/client.ts", source: `import { z } from "zod";` },
    ]);
    expect(violations).toEqual([
      "src/marvelrivalsapi/client.ts: no boundary rule covers this file; add one to scripts/boundaries.ts",
    ]);
  });

  it("catches a dynamic import, which oxfmt writes without a space", () => {
    const violations = findViolations([
      { path: "src/ui/MatchCard.tsx", source: `const run = await import("@/store/run");` },
    ]);
    expect(violations).toEqual([
      `src/ui/MatchCard.tsx: imports "@/store/run", which ui may not use`,
    ]);
  });

  it("doesn't let a comment mentioning `import type` hide the import after it", () => {
    const source = `// We import type guards from domain\nimport { syncOnce } from "@/store/run";`;
    expect(findViolations([{ path: "src/ui/MatchCard.tsx", source }])).toEqual([
      `src/ui/MatchCard.tsx: imports "@/store/run", which ui may not use`,
    ]);
  });

  it("catches glob, template and computed dynamic imports", () => {
    const source = [
      `const all = import.meta.glob("../store/*.ts");`,
      "const one = await import(`../store/${name}`);",
      `const any = await import(path);`,
    ].join("\n");
    expect(findViolations([{ path: "src/ui/MatchCard.tsx", source }])).toEqual([
      `src/ui/MatchCard.tsx: imports "../store/*.ts", which ui may not use`,
      'src/ui/MatchCard.tsx: imports "../store/${name}", which ui may not use',
      "src/ui/MatchCard.tsx: has a dynamic import with a computed path, which can't be checked",
    ]);
  });

  it("accepts an allowed dynamic import the formatter split across lines", () => {
    const source = `const model = await import(\n  "@/domain/model"\n);`;
    expect(findViolations([{ path: "src/ui/MatchCard.tsx", source }])).toEqual([]);
  });

  it("doesn't read a string that says from as an import", () => {
    const source = `const option = { label: "from", value: "x" };\n/** Charged, from \`x-credit-cost\`. */`;
    expect(findViolations([{ path: "src/ui/MatchCard.tsx", source }])).toEqual([]);
  });

  it("lets a page view take types from its loader but not values, which would bundle the server", () => {
    const typeOnly = `import type { Props } from "./index.server";`;
    const value = `import { loader } from "./index.server";`;
    expect(findViolations([{ path: "pages/index.tsx", source: typeOnly }])).toEqual([]);
    expect(findViolations([{ path: "pages/index.tsx", source: value }])).toEqual([
      `pages/index.tsx: imports "./index.server", which page views may not use`,
    ]);
  });

  it("keeps void/kv inside voidKv.ts so store logic stays testable against memory KV", () => {
    const source = `import { kv } from "void/kv";`;
    expect(findViolations([{ path: "src/store/voidKv.ts", source }])).toEqual([]);
    expect(findViolations([{ path: "src/store/run.ts", source }])).toEqual([
      `src/store/run.ts: imports "void/kv", which store may not use`,
    ]);
  });

  it("allows test helpers in tests only", () => {
    const source = `import { aMatch } from "../../test/builders";`;
    expect(findViolations([{ path: "src/domain/scope.test.ts", source }])).toEqual([]);
    expect(findViolations([{ path: "src/domain/scope.ts", source }])).toEqual([
      `src/domain/scope.ts: imports "../../test/builders", which domain may not use`,
    ]);
  });
});
