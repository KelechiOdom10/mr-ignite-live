import { describe, expect, it } from "vitest";

import { UidSchema } from "@/domain/player";

import {
  fakeRivalsTracker,
  RECORDED_MATCH,
  RECORDED_UIDS,
  type Scripted,
} from "../../test/fakeRivalsTracker";
import { createRivalsTrackerClient } from "./client";
import { NotFoundError, RivalsTrackerContractError, UpstreamUnavailableError } from "./errors";
import { HERO_CATALOGUE } from "./heroes";

const sypeh = UidSchema.parse(RECORDED_UIDS.sypeh);
const trqstMe = UidSchema.parse(RECORDED_UIDS.trqstMe);

function client(scripted?: Record<string, Scripted>) {
  const fake = fakeRivalsTracker(scripted);

  return { fake, client: createRivalsTrackerClient({ fetch: fake.fetch }) };
}

describe("RivalsTracker client against recorded responses", () => {
  it("parses every recorded endpoint we call, so a schema stricter than the real site fails here", async () => {
    const { client: c } = client();
    const search = await c.call("search", { name: "Sypeh" });
    expect(search[0]?.aid).toBe(sypeh);
    expect(search).toHaveLength(10);

    const career = await c.call("career", { uid: trqstMe });
    expect(career.player.info.name).toBe("NAVI TrqstMe");
    expect(career.stats.total_matches).toBe(100);
    expect(career.visibility.match_history).toBe(false);

    const history = await c.call("history", { uid: sypeh });
    expect(history.match_history).toHaveLength(20);
    expect(history.match_history[0]?.match_uid).toBe("4964445_1793847522_1272487_11001_12");

    const match = await c.call("match", { matchUid: RECORDED_MATCH });
    expect(match.match_players).toHaveLength(12);
    expect(match.dynamic_fields?.ban_pick_info).toHaveLength(6);

    const board = await c.call("leaderboard", { device: "pc" });
    expect(board.players).toHaveLength(500);

    const miss = await c.call("search", { name: "zzqxnoplayer77" });
    expect(miss).toEqual([]);

    const heroes = await c.call("heroes", {});
    expect(heroes.heroes).toHaveLength(HERO_CATALOGUE.length);
  });

  it("names a missing player and a missing match distinctly from a changed contract", async () => {
    const { client: c } = client();

    await expect(c.call("career", { uid: UidSchema.parse("999999999") })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(c.call("match", { matchUid: "1_1_1_1_1" })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("fails loudly when a response changes shape instead of rendering half a player", async () => {
    const { client: c } = client({
      [`GET /player/${trqstMe}`]: { status: 200, body: { player: {} } },
    });

    const call = c.call("career", { uid: trqstMe });
    await expect(call).rejects.toBeInstanceOf(RivalsTrackerContractError);
    await expect(call).rejects.toMatchObject({ endpoint: "career", requests: 1 });
  });

  it("turns a dropped connection into an unavailable error, not a crash", async () => {
    const c = createRivalsTrackerClient({
      fetch: () => Promise.reject(new TypeError("network down")),
    });

    await expect(c.call("heroes", {})).resolves.toBeDefined();
    await expect(c.call("match", { matchUid: RECORDED_MATCH })).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
  });

  it("sends an identifying User-Agent with no email address", async () => {
    let seen: Headers | undefined;

    const c = createRivalsTrackerClient({
      fetch: async (input, init) => {
        seen = new Headers(init?.headers);

        return fakeRivalsTracker().fetch(input, init);
      },
    });

    await c.call("match", { matchUid: RECORDED_MATCH });
    expect(seen?.get("user-agent")).toBe("RivalsHub/1.0 (personal, non-commercial)");
    expect(seen?.get("user-agent")).not.toContain("@");
  });

  it("keeps at most two upstream requests open per client", async () => {
    const fake = fakeRivalsTracker();
    let active = 0;
    let peak = 0;

    const c = createRivalsTrackerClient({
      fetch: async (input, init) => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;

        return fake.fetch(input, init);
      },
    });

    await Promise.all([
      c.call("career", { uid: sypeh }),
      c.call("career", { uid: trqstMe }),
      c.call("match", { matchUid: RECORDED_MATCH }),
      c.call("leaderboard", { device: "pc" }),
    ]);

    expect(peak).toBe(2);
  });
});
