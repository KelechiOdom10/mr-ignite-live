import { describe, expect, it } from "vitest";

import { MatchStatsSchema } from "./stats";

describe("MatchStatsSchema", () => {
  it("still reads stats stored before draft order was kept, marking the draft as unknown", () => {
    const stored = {
      matchId: "m1",
      source: "mrvl",
      sourceMatchId: "s1",
      sourceUpdatedAt: "1",
      fetchedAt: "2026-10-16T23:30:35.341Z",
      maps: [
        {
          index: 1,
          map: "Krakoa",
          durationSeconds: 600,
          teams: [
            { name: "A", won: true, score: 1, bans: [], players: [] },
            { name: "B", won: false, score: 0, bans: [], players: [] },
          ],
        },
      ],
    };
    expect(MatchStatsSchema.parse(stored).maps[0]?.draft).toBeNull();
  });
});
