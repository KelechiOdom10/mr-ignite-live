import { z } from "zod";

import { mrvlFixture } from "./fixtures";

/** mrvl's id for FlyQuest vs 100 Thieves, the series recorded in `page-fly-100t.json`. */
export const FLY_100T_MRVL_ID = "js72wqatvzmfw26ffhc1fynh4n8gcxsw";

/** mrvl's id for the live Liquid Citadel vs Swamp Gaming series in `live.json`. */
export const TLC_SWAMP_MRVL_ID = "js7d3e97gbkfsnm3fycnean4p58gd5sy";

const SummarySchema = z.looseObject({ id: z.string(), updatedAt: z.unknown().optional() });
const ListEnvelopeSchema = z.looseObject({ value: z.array(SummarySchema) });

const PageEnvelopeSchema = z.looseObject({
  value: z.looseObject({
    match: z.looseObject({
      id: z.string(),
      games: z.array(z.looseObject({ scoreboard: z.unknown().optional() })),
    }),
  }),
});

const RequestSchema = z.object({
  path: z.string(),
  args: z.looseObject({ status: z.string().optional(), id: z.string().optional() }),
});

const recordedLive = ListEnvelopeSchema.parse(mrvlFixture("live.json"));
const recordedRecent = ListEnvelopeSchema.parse(mrvlFixture("recent.json"));
const recordedPage = PageEnvelopeSchema.parse(mrvlFixture("page-fly-100t.json"));

/**
 * The recorded FLY–100T page for its own id. Any other series answers as mrvl lists a series it
 * has no replays for yet: the recorded page with every game unplayed (no scoreboard).
 */
function pageFor(id: string): unknown {
  if (id === FLY_100T_MRVL_ID) return recordedPage;
  const match = recordedPage.value.match;
  const games = match.games.filter((g) => !g.scoreboard);

  return { ...recordedPage, value: { ...recordedPage.value, match: { ...match, id, games } } };
}

export interface MrvlFakeOptions {
  /** Every request fails with HTTP 502. */
  down?: boolean;
  /** Series ids whose page request fails with HTTP 502. */
  failingPages?: string[];
  /** Series ids whose page request never answers, like a dead connection, until it is aborted. */
  hangingPages?: string[];
  /** mrvl re-saved these series: their `updatedAt` moves on with nothing else changed. */
  resaved?: string[];
}

export function fakeMrvl(options: MrvlFakeOptions = {}) {
  const requests: z.infer<typeof RequestSchema>[] = [];
  const settings = { ...options };

  function list(status: string | undefined): unknown {
    const recorded = status === "live" ? recordedLive : status === "recent" ? recordedRecent : null;

    // No upcoming list was recorded; an empty one is the live list with its entries removed.
    if (!recorded) return { ...recordedLive, value: [] };

    const value = recorded.value.map((s) =>
      settings.resaved?.includes(s.id) ? { ...s, updatedAt: `${String(s.updatedAt)}+resaved` } : s,
    );

    return { ...recorded, value };
  }

  const fetchImpl: typeof fetch = async (_input, init) => {
    const request = RequestSchema.parse(JSON.parse(String(init?.body)));
    requests.push(request);
    const id = request.args.id ?? "";

    if (settings.hangingPages?.includes(id)) {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });
    }

    if (settings.down || settings.failingPages?.includes(id)) {
      return new Response("Bad Gateway", { status: 502 });
    }

    const body = request.path === "matches:getPageData" ? pageFor(id) : list(request.args.status);

    return new Response(JSON.stringify(body), { status: 200 });
  };

  return { fetch: fetchImpl, requests, settings };
}
