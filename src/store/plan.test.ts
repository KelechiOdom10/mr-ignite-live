import { describe, expect, it } from "vitest";

import type { PageData, StoredSnapshot } from "@/domain/model";

import { aMatch } from "../../test/builders";
import {
  applyPages,
  emptyStored,
  mergeMapOverrides,
  planSync,
  teamsMissingInfo,
  toSnapshot,
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
