import { describe, expect, it } from "vitest";

import { memoryKvStore } from "../../test/memoryKv";
import { readAllMatchStats } from "./stats";

const stored = (matchId: string) => ({
  matchId,
  source: "mrvl",
  sourceMatchId: `s-${matchId}`,
  sourceUpdatedAt: "1",
  fetchedAt: "2026-10-17T00:00:00.000Z",
  maps: [],
});

describe("readAllMatchStats", () => {
  it("reads every indexed series and skips one stored in a shape that no longer parses", async () => {
    const store = memoryKvStore({
      "stats-index:v2": {
        a: { sourceMatchId: "s-a", sourceUpdatedAt: "1" },
        b: { sourceMatchId: "s-b", sourceUpdatedAt: "1" },
        c: { sourceMatchId: "s-c", sourceUpdatedAt: "1" },
      },
      "stats:v2:a": stored("a"),
      "stats:v2:b": { matchId: "b", maps: "not a list" },
    });
    expect((await readAllMatchStats(store)).map((s) => s.matchId)).toEqual(["a"]);
  });
});
