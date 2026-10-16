import { describe, expect, it } from "vitest";

import type { PageData, StoredSnapshot } from "@/domain/model";
import type { MatchStats } from "@/domain/stats";

import { aMatch } from "../../test/builders";
import {
  applyPages,
  emptyStored,
  mergeMapOverrides,
  planSync,
  statsChanged,
  teamsMissingInfo,
  toSnapshot,
  withMapOverrides,
} from "./plan";

function aPage(revid: number, overrides: Partial<PageData> = {}): PageData {
  return { revid, updatedAt: "2026-10-16T00:00:00Z", event: null, matches: [], ...overrides };
}

describe("planSync", () => {
  const pages = { A: aPage(1), B: aPage(2), Gone: aPage(3) };
  const revisions = new Map([
    ["A", { revid: 1, timestamp: "t" }],
    ["B", { revid: 5, timestamp: "t" }],
    ["New", { revid: 9, timestamp: "t" }],
  ]);

  it("refetches only pages whose revision moved, plus new pages", () => {
    expect(planSync(pages, revisions)).toEqual({ changed: ["B", "New"], removed: ["Gone"] });
  });

  it("plans nothing when every revision is unchanged", () => {
    const same = new Map([["A", { revid: 1, timestamp: "t" }]]);
    expect(planSync({ A: aPage(1) }, same)).toEqual({ changed: [], removed: [] });
  });
});

describe("applyPages", () => {
  it("drops removed pages and overwrites updated ones without mutating the input", () => {
    const pages = { A: aPage(1), Gone: aPage(2) };
    const next = applyPages(pages, ["Gone"], { A: aPage(7) });
    expect(Object.keys(next)).toEqual(["A"]);
    expect(next.A?.revid).toBe(7);
    expect(pages.Gone).toBeDefined();
  });
});

describe("teamsMissingInfo", () => {
  it("lists only teams with no stored info, once each", () => {
    const pages = {
      A: aPage(1, {
        matches: [aMatch(), aMatch({ id: "x", team2: { name: "Dreamland", short: "DRE" } })],
      }),
    };
    const known: StoredSnapshot["teams"] = {
      "Liquid Citadel": { short: "TLC", logoDark: null, logoLight: null },
    };
    expect(teamsMissingInfo(pages, known).sort()).toEqual(["Dreamland", "Swamp Gaming"]);
  });
});

describe("toSnapshot", () => {
  it("prefers Liquipedia's short tag over the guessed one", () => {
    const stored: StoredSnapshot = {
      ...emptyStored(),
      pages: {
        "MR Ignite/2026/Stage 2/Americas/Group Stage": aPage(1, {
          updatedAt: "2026-10-16T22:00:00Z",
          matches: [aMatch()],
        }),
        "MR Ignite/2026/Stage 2/EMEA": aPage(2, { updatedAt: "2026-10-16T23:00:00Z" }),
      },
      teams: { "Swamp Gaming": { short: "SWAMP", logoDark: null, logoLight: null } },
    };
    const snapshot = toSnapshot(stored, new Date("2026-10-17T00:00:00Z"));
    expect(snapshot.matches[0]?.team2?.short).toBe("SWAMP");
    expect(snapshot.matches[0]?.eventId).toBe("MR Ignite/2026/Stage 2/Americas");
    expect(snapshot.liquipediaUpdatedAt).toBe("2026-10-16T23:00:00Z");
  });
});

describe("mergeMapOverrides", () => {
  it("fills maps Liquipedia hasn't recorded yet without overwriting ones it has", () => {
    // mrvl showed TLC 2–0 while Liquipedia still had 1–0.
    const merged = mergeMapOverrides(
      [
        { index: 1, map: "Birnin T'Challa", score1: 2, score2: 0, winner: 1, vod: "v1" },
        { index: 2, map: "", score1: null, score2: null, winner: 0, vod: null },
      ],
      [
        { index: 1, map: "Birnin T'Challa", score1: 9, score2: 9, winner: 2 },
        { index: 2, map: "Midtown", score1: 3, score2: 1, winner: 1 },
      ],
    );
    expect(merged.map((m) => [m.index, m.winner, m.score1, m.vod])).toEqual([
      [1, 1, 2, "v1"],
      [2, 1, 3, null],
    ]);
  });
});

describe("withMapOverrides", () => {
  const override = { index: 1, map: "Midtown", score1: 3, score2: 1, winner: 1 } as const;

  it("returns null when mrvl repeats overrides already stored, so KV isn't rewritten", () => {
    // mrvl bumps updatedAt on every bulk edit; each rewrite cost a KV write a minute while live.
    const stored = { ...emptyStored(), mapOverrides: { m1: [override] } };
    expect(withMapOverrides(stored, { m1: [{ ...override }] })).toBeNull();
  });

  it("adds new overrides and keeps other matches' ones", () => {
    const stored = { ...emptyStored(), mapOverrides: { m1: [override] } };
    const next = withMapOverrides(stored, { m2: [{ ...override, index: 2 }] });
    expect(Object.keys(next?.mapOverrides ?? {})).toEqual(["m1", "m2"]);
  });
});

describe("statsChanged", () => {
  const stats: MatchStats = {
    matchId: "m1",
    source: "mrvl",
    sourceMatchId: "js1",
    sourceUpdatedAt: "a",
    fetchedAt: "2026-10-17T00:00:00.000Z",
    maps: [],
  };

  it("ignores a new fetch time or source timestamp when the maps are the same", () => {
    const refetched = { ...stats, sourceUpdatedAt: "b", fetchedAt: "2026-10-17T00:01:00.000Z" };
    expect(statsChanged(stats, refetched)).toBe(false);
  });

  it("reports stats never stored before as changed", () => {
    expect(statsChanged(null, stats)).toBe(true);
  });
});
