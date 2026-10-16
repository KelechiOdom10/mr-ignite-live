import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { z } from "zod";

export function liquipediaFixture(name: string): unknown {
  const path = fileURLToPath(new URL(`./fixtures/liquipedia/${name}`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8"));
}

const ContentsSchema = z.object({
  query: z.object({
    pages: z.array(
      z.object({
        title: z.string(),
        revisions: z.array(
          z.object({ slots: z.object({ main: z.object({ content: z.string() }) }) }),
        ),
      }),
    ),
  }),
});

export function recordedWikitext(title: string): string {
  const pages = ContentsSchema.parse(liquipediaFixture("contents-stage2.json")).query.pages;
  const content = pages.find((p) => p.title === title)?.revisions[0]?.slots.main.content;
  if (content === undefined) throw new Error(`No recorded wikitext for ${title}`);
  return content;
}
