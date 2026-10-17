import { describe, expect, it } from "vitest";

import { UidSchema } from "@/domain/player";

import { fakeRivalsIsland, RECORDED_MATCH, RECORDED_UIDS } from "../../test/fakeRivalsIsland";
import { createRivalsIslandClient } from "./client";
import {
  MatchHistoryPrivateError,
  NotFoundError,
  PremiumRequiredError,
  RivalsIslandContractError,
} from "./errors";

const sypeh = UidSchema.parse(RECORDED_UIDS.sypeh);
const trqstMe = UidSchema.parse(RECORDED_UIDS.trqstMe);

function client(scripted?: Parameters<typeof fakeRivalsIsland>[0]) {
  const fake = fakeRivalsIsland(scripted);
  return { fake, client: createRivalsIslandClient({ apiKey: "test-key", fetch: fake.fetch }) };
}

describe("RivalsIsland client against recorded responses", () => {
  it("parses every recorded endpoint we call, so a schema stricter than the real API fails here", async () => {
    const { client: c } = client();
    const search = await c.call("search", { name: "NAVI TrqstMe" });
    expect(search.data.player?.uid).toBe(trqstMe);
    expect(search.cost).toBe(5);

    const career = await c.call("career", { uid: trqstMe });
    expect(career.data.player.club?.tag).toBe("NAVI");
    expect(career.data.career.matches).toBe(2708);

    const hero = await c.call("heroCareer", { uid: sypeh, heroId: 1011 });
    expect(hero.data.hero.name).toBe("BRUCE BANNER");
    expect(hero.data.career.matches).toBeCloseTo(7.5014, 3);

    const match = await c.call("match", { matchUid: RECORDED_MATCH });
    expect(match.data.players).toHaveLength(12);
    expect(match.data.players.flatMap((p) => p.heroes).length).toBeGreaterThanOrEqual(12);

    const board = await c.call("leaderboard", { device: "pc" });
    expect(board.data.entries).toHaveLength(100);
    expect(board.cost).toBe(1);

    const heroes = await c.call("heroes", {});
    expect(heroes.data.heroes).toHaveLength(56);
    expect(heroes.cost).toBeNull();
  });

  it("turns a private history into its own error at no cost, so the page can show rank without it", async () => {
    const path = `/players/${sypeh}/match-history?page=0&page_size=20&category=2`;
    const { client: c } = client({
      [path]: {
        status: 403,
        cost: 0,
        body: { error: "match history private", code: "match_history_private" },
      },
    });
    const call = c.call("history", { uid: sypeh, page: 0, category: 2 });
    await expect(call).rejects.toBeInstanceOf(MatchHistoryPrivateError);
    await expect(call).rejects.toMatchObject({ creditCost: 0 });
  });

  it("names premium-only and missing players distinctly", async () => {
    const { client: c } = client({
      "/heroes": { status: 402, cost: 0, body: { error: "premium", code: "premium_required" } },
    });
    await expect(c.call("heroes", {})).rejects.toBeInstanceOf(PremiumRequiredError);
    await expect(c.call("career", { uid: UidSchema.parse("42") })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("fails loudly when a response changes shape instead of rendering half a player", async () => {
    const { client: c } = client({
      [`/players/${trqstMe}/career`]: { status: 200, cost: 10, body: { player: {} } },
    });
    const call = c.call("career", { uid: trqstMe });
    await expect(call).rejects.toBeInstanceOf(RivalsIslandContractError);
    await expect(call).rejects.toMatchObject({ endpoint: "career", creditCost: 10 });
  });

  it("sends the key only in the x-api-key header", async () => {
    let seen: Headers | undefined;
    const c = createRivalsIslandClient({
      apiKey: "secret-key",
      fetch: async (input, init) => {
        seen = new Headers(init?.headers);
        expect(String(input)).not.toContain("secret-key");
        return fakeRivalsIsland().fetch(input);
      },
    });
    await c.call("heroes", {});
    expect(seen?.get("x-api-key")).toBe("secret-key");
  });
});
