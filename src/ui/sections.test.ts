import { describe, expect, it } from "vitest";

import { isPlayersPath } from "./sections";

describe("isPlayersPath", () => {
  it("covers every ranked player page", () => {
    for (const path of ["/players", "/player/670067075", "/leaderboard", "/game/5513337_1"]) {
      expect(isPlayersPath(path)).toBe(true);
    }
  });

  it("leaves esports pages, including look-alike prefixes, to the esports chrome", () => {
    for (const path of [
      "/",
      "/events",
      "/event/MR_Ignite/2026",
      "/match/abc",
      "/playersx",
      "/games",
    ]) {
      expect(isPlayersPath(path)).toBe(false);
    }
  });
});
