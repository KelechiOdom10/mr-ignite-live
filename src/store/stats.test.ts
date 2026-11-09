import { describe, expect, it } from "vitest";
import { z } from "zod";

import type { Snapshot } from "@/domain/model";
import {
  createMrvlClient,
  type MrvlClient,
  MrvlHttpError,
  MrvlMatchPageSchema,
  type MrvlMatchSummary,
} from "@/mrvl/client";

import { aMatch } from "../../test/builders";
import { mrvlFixture } from "../../test/fixtures";
import { memoryKvStore } from "../../test/memoryKv";
import { fetchStatsChanges, readAllMatchStats, writeBackfillMisses } from "./stats";

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

describe("fetchStatsChanges on a fresh store", () => {
  const now = Date.parse("2026-11-09T20:00:00Z");
  const daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000).toISOString();

  const old = aMatch({
    id: "old",
    startsAt: daysAgo(3),
    team1: { name: "Crimson", short: "CRM" },
    team2: { name: "Azure", short: "AZR" },
    markedFinished: true,
  });

  const oldIndexed = aMatch({
    id: "old-indexed",
    startsAt: daysAgo(4),
    team1: { name: "Ember", short: "EMB" },
    team2: { name: "Frost", short: "FRS" },
    markedFinished: true,
  });

  const recent = aMatch({
    id: "recent",
    startsAt: new Date(now - 60 * 60 * 1000).toISOString(),
    team1: { name: "Violet", short: "VLT" },
    team2: { name: "Amber", short: "AMB" },
    markedFinished: true,
  });

  const summaries: MrvlMatchSummary[] = [old, oldIndexed, recent].map((m) => ({
    id: `s-${m.id}`,
    teamOneName: m.team1?.name,
    teamTwoName: m.team2?.name,
    scheduledAt: m.startsAt,
    updatedAt: "1",
  }));

  const recorded = z
    .object({ value: MrvlMatchPageSchema })
    .parse(mrvlFixture("page-fly-100t.json")).value;

  it("fetches finished series older than the lookback that were never fetched, newest first", async () => {
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
      "stats-index:v2": {
        "old-indexed": {
          sourceMatchId: "s-old-indexed",
          sourceUpdatedAt: "1",
          draftOrder: true,
          heroLines: true,
        },
      },
    });

    const snapshot: Snapshot = {
      builtAt: new Date(now).toISOString(),
      servedAt: new Date(now).toISOString(),
      liquipediaUpdatedAt: null,
      events: [],
      matches: [old, oldIndexed, recent],
      teams: {},
    };

    await fetchStatsChanges({ store, mrvl, snapshot, now });

    expect(requested).toEqual(["s-recent", "s-old"]);
  });
});

describe("fetchStatsChanges backfill limits", () => {
  const now = Date.parse("2026-11-09T20:00:00Z");
  const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString();
  const names = ["Crimson", "Azure", "Ember", "Frost", "Violet", "Amber", "Onyx", "Jade"];

  const series = (id: string, startsAt: string, i: number) =>
    aMatch({
      id,
      startsAt,
      team1: { name: `${names[i]} Lions`, short: `L${i}` },
      team2: { name: `${names[i]} Hawks`, short: `H${i}` },
      markedFinished: true,
    });

  const summaryOf = (m: ReturnType<typeof aMatch>): MrvlMatchSummary => ({
    id: `s-${m.id}`,
    teamOneName: m.team1?.name,
    teamTwoName: m.team2?.name,
    scheduledAt: m.startsAt,
    updatedAt: "1",
  });

  const snapshotOf = (matches: ReturnType<typeof aMatch>[]): Snapshot => ({
    builtAt: new Date(now).toISOString(),
    servedAt: new Date(now).toISOString(),
    liquipediaUpdatedAt: null,
    events: [],
    matches,
    teams: {},
  });

  function fakeMrvl(listed: MrvlMatchSummary[], failing: string[] = []) {
    const requested: string[] = [];
    let lists = 0;

    const mrvl: MrvlClient = {
      ...createMrvlClient(),
      listMatches: async (status) => {
        lists++;

        return status === "recent" ? listed : [];
      },
      matchPage: async (id) => {
        requested.push(id);

        if (failing.includes(id)) throw new MrvlHttpError(404, "matches:getPageData");

        return { match: { id, games: [] } };
      },
    };

    return { mrvl, requested, lists: () => lists };
  }

  it("gives older series two of a run's six pages, after every recent series", async () => {
    const recent = [0, 1, 2].map((i) => series(`recent-${i}`, hoursAgo(1 + i), i));
    const old = [3, 4, 5, 6].map((i) => series(`old-${i}`, hoursAgo(24 * i), i));
    const all = [...recent, ...old];
    const { mrvl, requested } = fakeMrvl(all.map(summaryOf));

    await fetchStatsChanges({ store: memoryKvStore(), mrvl, snapshot: snapshotOf(all), now });

    expect(requested).toEqual(["s-recent-0", "s-recent-1", "s-recent-2", "s-old-3", "s-old-4"]);
  });

  it("stops asking mrvl about an older series its recent list no longer holds", async () => {
    const store = memoryKvStore();
    const snapshot = snapshotOf([series("gone", hoursAgo(48), 0)]);
    const fake = fakeMrvl([]);

    const first = await fetchStatsChanges({ store, mrvl: fake.mrvl, snapshot, now });

    if (first.misses) await writeBackfillMisses(store, first.misses);
    const listsAfterFirst = fake.lists();
    await fetchStatsChanges({ store, mrvl: fake.mrvl, snapshot, now });

    expect(listsAfterFirst).toBe(3);
    expect(fake.lists()).toBe(3);
  });

  it("gives up on an older series whose page keeps failing after three runs", async () => {
    const store = memoryKvStore();
    const broken = series("broken", hoursAgo(48), 0);
    const fake = fakeMrvl([summaryOf(broken)], ["s-broken"]);

    for (let run = 0; run < 5; run++) {
      const changes = await fetchStatsChanges({
        store,
        mrvl: fake.mrvl,
        snapshot: snapshotOf([broken]),
        now,
      });

      if (changes.misses) await writeBackfillMisses(store, changes.misses);
    }

    expect(fake.requested).toEqual(["s-broken", "s-broken", "s-broken"]);
  });

  it("leaves series older than two weeks alone", async () => {
    const fake = fakeMrvl([summaryOf(series("ancient", hoursAgo(24 * 15), 0))]);

    await fetchStatsChanges({
      store: memoryKvStore(),
      mrvl: fake.mrvl,
      snapshot: snapshotOf([series("ancient", hoursAgo(24 * 15), 0)]),
      now,
    });

    expect(fake.lists()).toBe(0);
  });
});
