import { z } from "zod";

export const LIQUIPEDIA_API = "https://liquipedia.net/marvelrivals/api.php";
// Liquipedia's API terms require an identifying User-Agent and gzip, and ask for ≤1 query per 2s.
export const LIQUIPEDIA_USER_AGENT =
  "MRIgniteLive/0.1 (personal live score tracker; contact via github.com/kelechiodom)";
const DEFAULT_MIN_GAP_MS = 2100;
const TITLES_PER_QUERY = 50;

export class LiquipediaHttpError extends Error {
  override name = "LiquipediaHttpError";
  constructor(
    readonly status: number,
    readonly action: string,
  ) {
    super(`Liquipedia returned HTTP ${status} for ${action}`);
  }
}

export class LiquipediaRateLimitedError extends LiquipediaHttpError {
  override name = "LiquipediaRateLimitedError";
}

export class LiquipediaApiError extends Error {
  override name = "LiquipediaApiError";
  constructor(
    readonly code: string,
    readonly info: string,
  ) {
    super(`Liquipedia API error ${code}: ${info}`);
  }
}

export class LiquipediaResponseError extends Error {
  override name = "LiquipediaResponseError";
  constructor(
    readonly action: string,
    readonly issues: z.core.$ZodIssue[],
  ) {
    super(`Unexpected Liquipedia response shape for ${action}`);
  }
}

export class LiquipediaBudgetSpentError extends Error {
  override name = "LiquipediaBudgetSpentError";
  constructor(readonly action: string) {
    super(`This sync run's Liquipedia budget is spent; ${action} waits for the next run`);
  }
}

const ApiErrorSchema = z.object({ error: z.object({ code: z.string(), info: z.string() }) });

const AllPagesSchema = z.object({
  query: z.object({ allpages: z.array(z.object({ title: z.string() })) }),
});

const RevisionsSchema = z.object({
  query: z.object({
    pages: z.array(
      z.object({
        title: z.string(),
        revisions: z
          .array(
            z.object({
              revid: z.number().optional(),
              timestamp: z.string().optional(),
              slots: z.object({ main: z.object({ content: z.string() }) }).optional(),
            }),
          )
          .optional(),
      }),
    ),
  }),
});

const ExpandTemplatesSchema = z.object({ expandtemplates: z.object({ wikitext: z.string() }) });

const ImageInfoSchema = z.object({
  query: z.object({
    pages: z.array(
      z.object({
        title: z.string(),
        imageinfo: z
          .array(z.object({ url: z.string(), thumburl: z.string().optional() }))
          .optional(),
      }),
    ),
  }),
});

export interface Revision {
  revid: number;
  timestamp: string;
}

export interface RunBudget {
  maxRequests: number;
  /** Epoch ms after which no request may start. */
  deadlineAt: number;
}

export interface LiquipediaClientOptions {
  fetch?: typeof fetch;
  wait?: (ms: number) => Promise<void>;
  now?: () => number;
  minGapMs?: number;
}

export type LiquipediaClient = ReturnType<typeof createLiquipediaClient>;
export type LiquipediaRun = ReturnType<LiquipediaClient["startRun"]>;

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function createLiquipediaClient(options: LiquipediaClientOptions = {}) {
  const doFetch = options.fetch ?? fetch;
  const wait = options.wait ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = options.now ?? Date.now;
  const minGapMs = options.minGapMs ?? DEFAULT_MIN_GAP_MS;
  // Shared by every run in this isolate, so back-to-back runs stay paced too.
  let lastRequestAt = Number.NEGATIVE_INFINITY;

  async function request<S extends z.ZodType>(
    run: { budget: RunBudget; requests: number },
    schema: S,
    params: Record<string, string>,
  ): Promise<z.infer<S>> {
    const action = params.action ?? "unknown";
    const startAt = Math.max(now(), lastRequestAt + minGapMs);
    if (run.requests >= run.budget.maxRequests || startAt > run.budget.deadlineAt) {
      throw new LiquipediaBudgetSpentError(action);
    }
    if (startAt > now()) await wait(startAt - now());
    run.requests++;
    lastRequestAt = now();

    const url = `${LIQUIPEDIA_API}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
    const res = await doFetch(url, {
      headers: { "User-Agent": LIQUIPEDIA_USER_AGENT, "Accept-Encoding": "gzip" },
    });
    if (res.status === 429) throw new LiquipediaRateLimitedError(res.status, action);
    if (!res.ok) throw new LiquipediaHttpError(res.status, action);

    const body: unknown = await res.json();
    const apiError = ApiErrorSchema.safeParse(body);
    if (apiError.success)
      throw new LiquipediaApiError(apiError.data.error.code, apiError.data.error.info);
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new LiquipediaResponseError(action, parsed.error.issues);
    return parsed.data;
  }

  function startRun(budget: RunBudget) {
    const run = { budget, requests: 0 };
    return {
      async listPages(prefix: string): Promise<string[]> {
        const body = await request(run, AllPagesSchema, {
          action: "query",
          list: "allpages",
          apprefix: prefix,
          aplimit: "200",
        });
        return body.query.allpages.map((p) => p.title);
      },

      async fetchRevisions(titles: string[]): Promise<Map<string, Revision>> {
        const out = new Map<string, Revision>();
        for (const batch of chunks(titles, TITLES_PER_QUERY)) {
          const body = await request(run, RevisionsSchema, {
            action: "query",
            prop: "revisions",
            rvprop: "ids|timestamp",
            titles: batch.join("|"),
          });
          for (const page of body.query.pages) {
            const rev = page.revisions?.[0];
            if (rev?.revid !== undefined && rev.timestamp !== undefined) {
              out.set(page.title, { revid: rev.revid, timestamp: rev.timestamp });
            }
          }
        }
        return out;
      },

      async fetchContents(titles: string[]): Promise<Map<string, string>> {
        const out = new Map<string, string>();
        for (const batch of chunks(titles, TITLES_PER_QUERY)) {
          const body = await request(run, RevisionsSchema, {
            action: "query",
            prop: "revisions",
            rvprop: "content",
            rvslots: "main",
            titles: batch.join("|"),
          });
          for (const page of body.query.pages) {
            const content = page.revisions?.[0]?.slots?.main.content;
            if (content !== undefined) out.set(page.title, content);
          }
        }
        return out;
      },

      async expandTemplates(text: string): Promise<string> {
        const body = await request(run, ExpandTemplatesSchema, {
          action: "expandtemplates",
          prop: "wikitext",
          text,
        });
        return body.expandtemplates.wikitext;
      },

      async imageUrls(files: string[], width: number): Promise<Map<string, string>> {
        const out = new Map<string, string>();
        for (const batch of chunks(files, TITLES_PER_QUERY)) {
          const body = await request(run, ImageInfoSchema, {
            action: "query",
            prop: "imageinfo",
            iiprop: "url",
            iiurlwidth: String(width),
            titles: batch.map((f) => `File:${f}`).join("|"),
          });
          for (const page of body.query.pages) {
            const info = page.imageinfo?.[0];
            if (info) out.set(page.title.replace(/^File:/, ""), info.thumburl ?? info.url);
          }
        }
        return out;
      },
    };
  }

  return { startRun };
}
