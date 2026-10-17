import { posix } from "node:path";

export interface BoundaryRule {
  name: string;
  files: RegExp;
  allow: readonly string[] | "any";
}

export interface SourceFile {
  path: string;
  source: string;
}

const UI_PACKAGES = ["react", "@void/react", "lucide-react"];

// First matching rule wins. A file no rule matches is a violation, so a new folder can't land unchecked.
export const RULES: readonly BoundaryRule[] = [
  { name: "beUI (vendored)", files: /^src\/(components|lib)\//, allow: "any" },
  { name: "domain", files: /^src\/domain\//, allow: ["zod"] },
  { name: "liquipedia", files: /^src\/liquipedia\//, allow: ["zod", "@/domain"] },
  { name: "mrvl", files: /^src\/mrvl\//, allow: ["zod", "@/domain"] },
  { name: "KV binding", files: /^src\/store\/voidKv\.ts$/, allow: ["void/kv"] },
  { name: "store", files: /^src\/store\//, allow: ["zod", "@/domain", "@/liquipedia", "@/mrvl"] },
  {
    name: "ui",
    files: /^src\/ui\//,
    allow: [...UI_PACKAGES, "void/live/client", "zod", "@/domain", "@/components", "@/lib"],
  },
  {
    name: "page views",
    files: /^pages\/.*\.tsx$/,
    allow: [...UI_PACKAGES, "@/domain", "@/ui", "@/components", "@/lib", "@/styles.css"],
  },
  {
    name: "runtime shell",
    files: /^(src\/[^/]+\.ts$|crons\/|routes\/|middleware\/|pages\/.*\.server\.ts$)/,
    allow: "any",
  },
  { name: "test helpers", files: /^test\//, allow: "any" },
  { name: "scripts", files: /^scripts\//, allow: "any" },
  { name: "root config", files: /^[^/]+\.ts$/, allow: "any" },
];

const TEST_ONLY = ["vitest", "test"];

const IMPORT =
  /(?:\bfrom\s+|\bimport\s*\(?\s*|\brequire\(\s*|\bimport\.meta\.glob\(\s*)["'`]([^"'`]+)["'`]/g;

const COMPUTED_IMPORT = /\bimport\s*\((?!\s*["'`])/;

// verbatimModuleSyntax erases these, so they can't pull server code into a bundle. `import { type X }` is not erased.
const TYPE_ONLY =
  /^\s*(?:import|export)\s+type\s+(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?|\w+)\s+from\s*["'][^"']+["']/gm;

/** Collapses a repo path or `@/` alias to the scope rules talk about: `@/<folder>`, `@/<root file>`, `<top folder>` or `<top folder>:server`. */
function scopeOfPath(path: string): string {
  if (path.startsWith("src/")) {
    const [first = ""] = path.slice("src/".length).split("/");
    return `@/${first.replace(/\.tsx?$/, "")}`;
  }
  const [top = ""] = path.split("/");
  return /\.server(\.tsx?)?$/.test(path) ? `${top}:server` : top;
}

function scopeOfImport(file: string, spec: string): string {
  if (spec.startsWith(".")) return scopeOfPath(posix.join(posix.dirname(file), spec));
  if (spec.startsWith("@/")) return scopeOfPath(`src/${spec.slice(2)}`);
  return spec;
}

function permits(allow: readonly string[], spec: string): boolean {
  return allow.some((a) => spec === a || spec.startsWith(`${a}/`));
}

export function findViolations(files: readonly SourceFile[], rules = RULES): string[] {
  const violations: string[] = [];
  for (const { path, source } of files) {
    const rule = rules.find((r) => r.files.test(path));
    if (!rule) {
      violations.push(
        `${path}: no boundary rule covers this file; add one to scripts/boundaries.ts`,
      );
      continue;
    }
    if (rule.allow === "any") continue;
    const allow = /\.test\.tsx?$/.test(path) ? [...rule.allow, ...TEST_ONLY] : rule.allow;
    const own = scopeOfPath(path);
    const code = source.replace(TYPE_ONLY, "");
    for (const [, spec = ""] of code.matchAll(IMPORT)) {
      if (spec.startsWith("node:") && /\.test\.tsx?$/.test(path)) continue;
      const scope = scopeOfImport(path, spec);
      if (scope === own || permits(allow, scope)) continue;
      violations.push(`${path}: imports "${spec}", which ${rule.name} may not use`);
    }
    if (COMPUTED_IMPORT.test(code)) {
      violations.push(`${path}: has a dynamic import with a computed path, which can't be checked`);
    }
  }
  return violations;
}
