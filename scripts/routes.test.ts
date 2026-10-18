import { existsSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { GO_TO_ROUTES, NAV_SECTIONS } from "../src/ui/sections";

/** The page file Void serves a static path from. */
function pageFile(href: string): string {
  return href === "/" ? "pages/index.tsx" : `pages${href}.tsx`;
}

function pageExists(href: string): boolean {
  return existsSync(pageFile(href)) || existsSync(`pages${href}/index.tsx`);
}

// Nav and search links are plain strings, so nothing else notices a link to a page that isn't here.
describe("shell links", () => {
  it("only points at pages that exist", () => {
    const hrefs = [...NAV_SECTIONS.map((n) => n.href), ...Object.values(GO_TO_ROUTES)];
    expect(hrefs.filter((href) => !pageExists(href))).toEqual([]);
  });
});
