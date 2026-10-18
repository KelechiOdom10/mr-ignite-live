import { z } from "zod";

import { liquipediaFixture } from "./fixtures";

export const AMERICAS = "MR Ignite/2026/Stage 2/Americas";
export const AMERICAS_GROUPS = "MR Ignite/2026/Stage 2/Americas/Group Stage";
export const PACIFIC = "MR Ignite/2026/Stage 2/Pacific/Asia";

/** The pages recorded in `contents-stage2.json`. */
export const RECORDED_TITLES = [AMERICAS, PACIFIC, AMERICAS_GROUPS];

const PageEntrySchema = z.looseObject({ title: z.string() });

const RecordedRevisionsSchema = z.looseObject({
  query: z.looseObject({
    pages: z.array(
      PageEntrySchema.extend({
        revisions: z.array(z.looseObject({ revid: z.number(), timestamp: z.string() })).optional(),
      }),
    ),
  }),
});

const RecordedContentsSchema = z.looseObject({
  query: z.looseObject({ pages: z.array(PageEntrySchema) }),
});

const recordedRevisions = RecordedRevisionsSchema.parse(liquipediaFixture("revisions.json"));
const recordedPage = recordedRevisions.query.pages.find((p) => p.revisions);
const recordedMissing = recordedRevisions.query.pages.find((p) => !p.revisions);
const recordedContents = RecordedContentsSchema.parse(liquipediaFixture("contents-stage2.json"));

export interface Clock {
  now(): number;
  advance(ms: number): void;
}

export function fakeClock(startIso: string): Clock {
  let at = Date.parse(startIso);

  return {
    now: () => at,
    advance(ms) {
      at += ms;
    },
  };
}

export interface FakeLiquipediaSettings {
  /** How long each response takes on the fake clock. */
  latencyMs: number;
  /** Image URLs Liquipedia has, by file name. */
  images: Record<string, string>;
}

export interface LiquipediaRequest {
  params: URLSearchParams;
  at: number;
}

/**
 * Answers Liquipedia API calls from the recorded fixtures. Revision ids are test inputs (only
 * Americas' was recorded), so a test can move a page's revision; contents always come from the
 * recording. Image lookups answer "missing", the recorded shape of an unknown title, unless the
 * test lists the file in `settings.images`. No image lookup was recorded, so a found file is the
 * recorded page entry plus the `imageinfo` the client reads.
 */
export function fakeLiquipedia({
  clock,
  revids,
}: {
  clock: Clock;
  revids: Record<string, number>;
}) {
  const requests: LiquipediaRequest[] = [];

  const settings: FakeLiquipediaSettings = { latencyMs: 0, images: {} };

  const titlesOf = (params: URLSearchParams) => (params.get("titles") ?? "").split("|");

  function respond(params: URLSearchParams): Response {
    if (params.get("action") === "expandtemplates")
      return Response.json(liquipediaFixture("teamshort.json"));

    if (params.get("prop") === "imageinfo") {
      const pages = titlesOf(params).map((title) => {
        const url = settings.images[title.replace(/^File:/, "")];

        return url
          ? { ...recordedPage, title, revisions: undefined, imageinfo: [{ url, thumburl: url }] }
          : { ...recordedMissing, title };
      });

      return Response.json({ query: { pages } });
    }

    if (params.get("rvprop") === "content") {
      const wanted = new Set(titlesOf(params));
      const pages = recordedContents.query.pages.filter((p) => wanted.has(p.title));

      return Response.json({ ...recordedContents, query: { ...recordedContents.query, pages } });
    }

    if (params.get("rvprop") === "ids|timestamp") {
      const recordedRevision = recordedPage?.revisions?.[0];

      const pages = titlesOf(params).map((title) => {
        const revid = revids[title];

        return revid === undefined
          ? { ...recordedMissing, title }
          : { ...recordedPage, title, revisions: [{ ...recordedRevision, revid }] };
      });

      return Response.json({ ...recordedRevisions, query: { ...recordedRevisions.query, pages } });
    }

    throw new Error(`No recorded Liquipedia response for ${params.toString()}`);
  }

  const fetchImpl: typeof fetch = async (input) => {
    const params = new URL(String(input)).searchParams;
    requests.push({ params, at: clock.now() });
    clock.advance(settings.latencyMs);

    return respond(params);
  };

  return { fetch: fetchImpl, requests, revids, settings };
}
