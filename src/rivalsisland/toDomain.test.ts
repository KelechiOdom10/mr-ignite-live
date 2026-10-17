import { describe, expect, it } from "vitest";

import { rivalsIslandFixture, RECORDED_UIDS } from "../../test/fakeRivalsIsland";
import { MatchDetailSchema } from "./schemas";
import { toMatchDetail } from "./toDomain";

describe("toMatchDetail", () => {
  it("splits the recorded match into its two teams with each player's most-played hero first", () => {
    const match = toMatchDetail(
      MatchDetailSchema.parse(rivalsIslandFixture("match-detail")),
      new Map(),
    );
    expect(match.teams.map((t) => [t.id, t.result, t.players.length])).toEqual([
      [1, "loss", 6],
      [0, "win", 6],
    ]);
    const sypeh = match.teams[1]?.players.find((p) => p.uid === RECORDED_UIDS.sypeh);
    expect(sypeh?.heroes[0]?.name).toBe("Invisible Woman");
    for (const p of match.teams.flatMap((t) => t.players)) {
      const times = p.heroes.map((h) => h.playSeconds);
      expect(times).toEqual([...times].sort((a, b) => b - a));
    }
    expect(match.draft.filter((d) => d.action === "ban")).toHaveLength(6);
  });
});
