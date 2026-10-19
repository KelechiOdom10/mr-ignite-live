import { describe, expect, it } from "vitest";
import { z } from "zod";

import type { Snapshot } from "@/domain/model";
import {
  createMrvlClient,
  type MrvlClient,
  MrvlMatchPageSchema,
  type MrvlMatchSummary,
} from "@/mrvl/client";

import { aMatch } from "../../test/builders";
import { mrvlFixture } from "../../test/fixtures";
import { memoryKvStore } from "../../test/memoryKv";
import { fetchStatsChanges, readAllMatchStats } from "./stats";

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

describe("fetchStatsChanges with draft-order backfills waiting", () => {
  const now = Date.parse("2026-10-17T20:00:00Z");

  const series = Array.from({ length: 8 }, (_, i) =>
    aMatch({
      id: `m${i}`,
      startsAt: new Date(now - (i + 1) * 60 * 60 * 1000).toISOString(),
      team1: { name: `Crimson${i}`, short: `C${i}` },
      team2: { name: `Azure${i}`, short: `A${i}` },
      markedFinished: true,
    }),
  );

  const summaries: MrvlMatchSummary[] = series.map((m, i) => ({
    id: `s${i}`,
    teamOneName: m.team1?.name,
    teamTwoName: m.team2?.name,
    scheduledAt: m.startsAt,
    updatedAt: i === 7 ? "changed" : "same",
  }));

  const recorded = z
    .object({ value: MrvlMatchPageSchema })
    .parse(mrvlFixture("page-fly-100t.json")).value;

  it("fetches a changed series before any backfill and stays within six pages", async () => {
    const requested: string[] = [];

    const mrvl: MrvlClient = {
      ...createMrvlClient(),
      listMatches: async (status) => (status === "recent" ? summaries : []),
      matchPage: async (id) => {
        requested.push(id);

        return { match: { ...recorded.match, id, games: [] } };
      },
    };

    const store = memoryKvStore({
      "stats-index:v2": Object.fromEntries(
        series.map((m, i) => [m.id, { sourceMatchId: `s${i}`, sourceUpdatedAt: "same" }]),
      ),
    });

    const snapshot: Snapshot = {
      builtAt: new Date(now).toISOString(),
      servedAt: new Date(now).toISOString(),
      liquipediaUpdatedAt: null,
      events: [],
      matches: series,
      teams: {},
    };

    await fetchStatsChanges({ store, mrvl, snapshot, now });

    expect(requested).toHaveLength(6);
    expect(requested[0]).toBe("s7");
  });
});
