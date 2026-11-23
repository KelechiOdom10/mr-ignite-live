import { describe, expect, it } from "vitest";

import type { PageData, Snapshot, StoredSnapshot } from "@/domain/model";
import type { MatchStats } from "@/domain/stats";
import { parseEventInfo, parseGroups, parsePageMatches } from "@/liquipedia/parse";

import { aMap, aMatch } from "../../test/builders";
import { recordedWikitext } from "../../test/fixtures";
import {
  applyPages,
  emptyStored,
  mergeMapOverrides,
  nextStored,
  planSync,
  statsChanged,
  teamsMissingInfo,
  toSnapshot,
  withMapOverrides,
} from "./plan";

function aPage(revid: number, overrides: Partial<PageData> = {}): PageData {
  return {
    revid,
    updatedAt: "2026-10-16T00:00:00Z",
    event: null,
    matches: [],
    groups: [],
    ...overrides,
  };
}

describe("planSync", () => {
  const pages = { A: aPage(1), B: aPage(2), Gone: aPage(3) };

  const revisions = new Map([
    ["A", { revid: 1, timestamp: "t" }],
    ["B", { revid: 5, timestamp: "t" }],
    ["New", { revid: 9, timestamp: "t" }],
  ]);

  it("refetches only pages whose revision moved, plus new pages", () => {
    expect(planSync(pages, revisions, 50)).toEqual({
      changed: ["B", "New"],
      deferred: [],
      removed: ["Gone"],
    });
  });

  it("plans nothing when every revision is unchanged", () => {
    const same = new Map([["A", { revid: 1, timestamp: "t" }]]);
    expect(planSync({ A: aPage(1) }, same, 50)).toEqual({ changed: [], deferred: [], removed: [] });
  });

  it("defers changed pages beyond one run's share instead of dropping them", () => {
    expect(planSync(pages, revisions, 1)).toMatchObject({ changed: ["B"], deferred: ["New"] });
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

  it("carries every page's groups, so the standings reach the client", () => {
    const group = {
      eventId: "MR Ignite/2026/Grand Finals",
      title: "Group A",
      matchGroups: ["list"],
      advance: 4,
    };

    const stored: StoredSnapshot = {
      ...emptyStored(),
      pages: { "MR Ignite/2026/Grand Finals/Group Stage": aPage(1, { groups: [group] }) },
    };

    expect(toSnapshot(stored, new Date("2026-11-23T00:00:00Z")).groups).toEqual([group]);
  });
});

describe("toSnapshot prize placings", () => {
  const AMERICAS = "MR Ignite/2026/Stage 2/Americas";
  const AMERICAS_GROUPS = "MR Ignite/2026/Stage 2/Americas/Group Stage";

  function recordedPage(title: string, file: string, updatedAt: string): PageData {
    const text = recordedWikitext(title, file);

    return {
      revid: 1,
      updatedAt,
      event: parseEventInfo(title, text, updatedAt),
      matches: parsePageMatches(title, text),
      groups: parseGroups(title, text),
    };
  }

  function snapshotOf(eventFile: string): Snapshot {
    const stored: StoredSnapshot = {
      ...emptyStored(),
      builtAt: "2026-11-09T00:00:00Z",
      pages: {
        [AMERICAS]: recordedPage(AMERICAS, eventFile, "2026-11-09T00:00:00Z"),
        [AMERICAS_GROUPS]: recordedPage(
          AMERICAS_GROUPS,
          "contents-stage2.json",
          "2026-10-16T00:00:00Z",
        ),
      },
    };

    return toSnapshot(stored, new Date("2026-11-09T00:00:00Z"));
  }

  function places(snapshot: Snapshot) {
    const event = snapshot.events.find((e) => e.id === AMERICAS);

    return (event?.prizes ?? []).map((prize) => [prize.place, prize.team?.name ?? null]);
  }

  it("fills a finished event's places from the bracket, as Liquipedia renders them", () => {
    const snapshot = snapshotOf("americas-finished.json");

    expect(places(snapshot)).toEqual([
      [1, "Liquid Citadel"],
      [2, "FlyQuest"],
      [3, "Swamp Gaming"],
      [4, "100 Thieves"],
      [5, "NRG Shock"],
      [6, "Spacestation Gaming"],
      [7, "Dreamland"],
      [8, "Yeah We Lost"],
      [9, null],
      [10, null],
      [11, null],
      [12, null],
    ]);
    expect(snapshot.events.find((e) => e.id === AMERICAS)?.prizesFromBracket).toBe(true);
  });

  it("leaves every place TBD while the playoffs are unfinished", () => {
    const snapshot = snapshotOf("contents-stage2.json");

    expect(places(snapshot).every(([, team]) => team === null)).toBe(true);
    expect(snapshot.events.find((e) => e.id === AMERICAS)?.prizesFromBracket).toBe(false);
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

describe("nextStored", () => {
  const builtAt = new Date("2026-10-16T22:31:00Z");
  const noLiquipediaChanges = { updates: {}, removed: [], teams: {}, deferred: [] };

  it("returns null when neither Liquipedia nor mrvl brought anything new, so KV isn't rewritten", () => {
    const override = { index: 1, map: "Midtown", score1: 3, score2: 1, winner: 1 } as const;
    const prev = { ...emptyStored(), mapOverrides: { m1: [override] } };
    expect(
      nextStored({
        prev,
        liquipedia: noLiquipediaChanges,
        mapOverrides: { m1: [override] },
        builtAt,
      }),
    ).toBeNull();
  });

  it("keeps Liquipedia's map winner over mrvl's when both arrive in the same write", () => {
    const title = "MR Ignite/2026/Stage 2/Americas";
    const match = aMatch({ maps: [aMap(1, 1), aMap(2, 0)] });

    const next = nextStored({
      prev: emptyStored(),
      liquipedia: { ...noLiquipediaChanges, updates: { [title]: aPage(7, { matches: [match] }) } },
      mapOverrides: {
        [match.id]: [
          { index: 1, map: "Map 1", score1: 0, score2: 3, winner: 2 },
          { index: 2, map: "Midtown", score1: 3, score2: 2, winner: 1 },
        ],
      },
      builtAt,
    });

    expect(next?.builtAt).toBe(builtAt.toISOString());
    const maps = next ? toSnapshot(next, builtAt).matches[0]?.maps : [];
    expect(maps?.map((m) => [m.index, m.winner])).toEqual([
      [1, 1],
      [2, 1],
    ]);
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
