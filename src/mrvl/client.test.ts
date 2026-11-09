import { describe, expect, it } from "vitest";

import { mrvlFixture } from "../../test/fixtures";
import type { Json } from "../../test/json";
import { createMrvlClient, MrvlHttpError, MrvlResponseError, MrvlUnreachableError } from "./client";

function respondWith(body: Json, status = 200) {
  const calls: RequestInit[] = [];

  const fetchImpl: typeof fetch = async (_input, init) => {
    calls.push(init ?? {});

    return new Response(JSON.stringify(body), { status });
  };

  return { fetchImpl, calls };
}

/** A fetch over a dead connection: it never settles unless its signal aborts. */
const hangingFetch: typeof fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
  });

describe("createMrvlClient", () => {
  it("posts a Convex query and unwraps the envelope", async () => {
    const { fetchImpl, calls } = respondWith(mrvlFixture("live.json"));
    const matches = await createMrvlClient({ fetch: fetchImpl }).listMatches("live", 20);
    expect(matches[0]?.teamOneName).toBe("Liquid Citadel");
    expect(JSON.parse(String(calls[0]?.body))).toEqual({
      path: "matches:listSummary",
      args: { status: "live", limit: 20 },
      format: "json",
    });
  });

  it("surfaces a Convex error envelope as a typed error", async () => {
    const { fetchImpl } = respondWith({ status: "error", errorMessage: "Server Error" });
    await expect(createMrvlClient({ fetch: fetchImpl }).matchPage("x")).rejects.toBeInstanceOf(
      MrvlResponseError,
    );
  });

  it("surfaces HTTP failures as a typed error", async () => {
    const { fetchImpl } = respondWith({}, 502);
    await expect(createMrvlClient({ fetch: fetchImpl }).matchPage("x")).rejects.toBeInstanceOf(
      MrvlHttpError,
    );
  });

  it("gives up on a request that never answers, so a dead connection can't stall the sync", async () => {
    const call = createMrvlClient({ fetch: hangingFetch, timeoutMs: 20 }).matchPage("x");
    await expect(call).rejects.toBeInstanceOf(MrvlUnreachableError);
  });

  it("parses the recorded hero matrix and asks for the map dimension", async () => {
    const { fetchImpl, calls } = respondWith(mrvlFixture("hero-matrix.json"));

    const matrix = await createMrvlClient({ fetch: fetchImpl }).heroMatrix({
      startDate: "2026-10-11",
      endDate: "2026-11-09",
    });

    expect(matrix.rows[0]?.groupLabel).toBe("Overall");
    expect(matrix.heroes).toHaveLength(57);
    expect(JSON.parse(String(calls[0]?.body))).toEqual({
      path: "analytics:getHeroMatrix",
      args: {
        startDate: "2026-10-11",
        endDate: "2026-11-09",
        dimension: "map",
        metric: "pickRate",
      },
      format: "json",
    });
  });

  it("rejects a hero-matrix cell that lost the weight of its win rate", async () => {
    const body = {
      status: "success",
      value: {
        dimension: "map",
        metric: "pickRate",
        heroes: [{ heroId: "gambit", heroName: "Gambit" }],
        rows: [
          {
            groupId: "overall",
            groupLabel: "Overall",
            isOverall: true,
            eligibleGames: 2,
            gameCount: 1,
            cellsByHeroId: {
              gambit: {
                heroId: "gambit",
                heroName: "Gambit",
                value: 1,
                playTimeSeconds: 60,
                totalAvailablePlayTimeSeconds: 60,
                heroGames: 1,
                banCount: 0,
                protectCount: 0,
                bannedAgainstCount: 0,
                protectedAgainstCount: 0,
              },
            },
          },
        ],
      },
    };

    await expect(
      createMrvlClient({ fetch: respondWith(body).fetchImpl }).heroMatrix({
        startDate: "2026-10-11",
        endDate: "2026-11-09",
      }),
    ).rejects.toBeInstanceOf(MrvlResponseError);
  });
});
