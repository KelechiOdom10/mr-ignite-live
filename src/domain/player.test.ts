import { describe, expect, it } from "vitest";

import {
  groupBySeason,
  MIN_MATCHES_FOR_WIN_RATE,
  parseRecentPlayers,
  RECENT_PLAYERS_LIMIT,
  rememberPlayer,
  searchableName,
  searchPrefill,
  rankTrend,
  recentHeroes,
  seasonRecord,
  UidSchema,
  type HistoryRow,
  type MatchDetail,
  type MatchPlayer,
  type PlayerProfile,
  type Result,
} from "./player";

const me = UidSchema.parse("670067075");
const other = UidSchema.parse("1124326809");

function hero(id: number, name: string, playSeconds: number) {
  return { id, name, role: null, iconUrl: null, playSeconds };
}

function player(uid: typeof me, heroes: ReturnType<typeof hero>[]): MatchPlayer {
  return {
    uid,
    name: uid,
    isAi: false,
    leftGame: false,
    kills: 0,
    deaths: 0,
    assists: 0,
    damage: 0,
    healing: 0,
    damageTaken: 0,
    accuracy: null,
    mvp: false,
    svp: false,
    heroes,
  };
}

function match(players: MatchPlayer[]): MatchDetail {
  return {
    matchUid: "m",
    playedAt: "2026-10-16T15:00:00Z",
    mode: null,
    map: null,
    category: null,
    season: null,
    durationSeconds: 600,
    teams: [{ id: 0, score: 3, result: "win", players }],
    draft: [],
  };
}

describe("recentHeroes", () => {
  it("adds up only this player's time per hero across matches, most played first", () => {
    const matches = [
      match([
        player(me, [hero(1031, "Luna Snow", 300)]),
        player(other, [hero(1048, "Psylocke", 900)]),
      ]),
      match([player(me, [hero(1031, "Luna Snow", 200), hero(1011, "Bruce Banner", 400)])]),
    ];

    expect(recentHeroes(me, matches).map((h) => [h.name, h.playSeconds])).toEqual([
      ["Luna Snow", 500],
      ["Bruce Banner", 400],
    ]);
  });
});

function profile(season: string | null, seasonMatches: number | null, seasonWins: number | null) {
  const rank = { name: null, level: null, score: null };

  const p: PlayerProfile = {
    uid: me,
    name: "me",
    level: null,
    club: null,
    iconUrl: null,
    signatureHero: null,
    season,
    rank,
    peakRank: rank,
    seasonWins,
    seasonMatches,
    lastOnline: null,
  };

  return p;
}

describe("seasonRecord", () => {
  it("withholds a win rate until the season has enough matches", () => {
    expect(seasonRecord(profile("10.5", MIN_MATCHES_FOR_WIN_RATE - 1, 9)).kind).toBe("few");
    expect(seasonRecord(profile("10.5", MIN_MATCHES_FOR_WIN_RATE, 5))).toMatchObject({
      kind: "enough",
      winRate: 0.5,
    });
  });

  it("tells no matches this season apart from an unknown count", () => {
    expect(seasonRecord(profile("10.5", 0, 0)).kind).toBe("none");
    expect(seasonRecord(profile("10.5", null, null)).kind).toBe("unknown");
    expect(seasonRecord(profile(null, 3, 1)).kind).toBe("unknown");
  });

  it("doesn't turn a missing win count into a 0% season", () => {
    expect(seasonRecord(profile("10.5", 12, null)).kind).toBe("unknown");
  });
});

describe("groupBySeason", () => {
  function row(matchUid: string, season: string | null): HistoryRow {
    return {
      matchUid,
      playedAt: "2026-10-16T15:00:00Z",
      season,
      mode: null,
      map: null,
      category: null,
      result: "win",
      score: null,
      kills: 0,
      deaths: 0,
      assists: 0,
      kda: null,
      mvp: false,
      svp: false,
      leftGame: false,
      rankChange: null,
      rankAfter: null,
      device: null,
      durationSeconds: 600,
    };
  }

  it("keeps order and starts a new group at each season change", () => {
    const groups = groupBySeason([row("a", "10.5"), row("b", "10.0"), row("c", "10.0")]);
    expect(groups.map((g) => [g.season, g.rows.map((r) => r.matchUid)])).toEqual([
      ["10.5", ["a"]],
      ["10.0", ["b", "c"]],
    ]);
  });
});

describe("recent players", () => {
  it("drops malformed storage instead of trusting it", () => {
    expect(parseRecentPlayers("not json")).toEqual([]);
    expect(parseRecentPlayers('{"uid":"1"}')).toEqual([]);
    expect(
      parseRecentPlayers('[{"uid":"670067075","name":"Sypeh"},{"uid":"0","name":"bad uid"},7]'),
    ).toEqual([{ uid: me, name: "Sypeh" }]);
  });

  it("moves a revisited player to the front without duplicating, capped", () => {
    const many = Array.from({ length: RECENT_PLAYERS_LIMIT }, (_, i) => ({
      uid: UidSchema.parse(String(i + 1)),
      name: `p${i + 1}`,
    }));

    const next = rememberPlayer(many, { uid: UidSchema.parse("3"), name: "p3 renamed" });
    expect(next).toHaveLength(RECENT_PLAYERS_LIMIT);
    expect(next[0]).toEqual({ uid: "3", name: "p3 renamed" });
    expect(next.filter((p) => p.uid === "3")).toHaveLength(1);
  });
});

describe("searchableName", () => {
  it("only offers names RivalsIsland's exact search accepts", () => {
    expect(searchableName(" Sypeh ")).toBe("Sypeh");
    expect(searchableName("")).toBeNull();
    expect(searchableName("a".repeat(17))).toBeNull();
  });
});

describe("searchPrefill", () => {
  it("prefills and focuses a valid name, and drops a blank or over-long one", () => {
    expect(searchPrefill(" Sypeh ", undefined)).toEqual({ name: "Sypeh", focus: true });
    expect(searchPrefill("   ", undefined)).toEqual({ name: "", focus: false });
    expect(searchPrefill("a".repeat(17), undefined)).toEqual({ name: "", focus: false });
  });

  it("focuses an empty field only when global search asked for it", () => {
    expect(searchPrefill(undefined, "name")).toEqual({ name: "", focus: true });
    expect(searchPrefill(undefined, "other")).toEqual({ name: "", focus: false });
  });
});

describe("rankTrend", () => {
  function ranked(result: Result, change: number, ladder: number, uid: string): HistoryRow {
    return {
      matchUid: uid,
      playedAt: "2026-10-16T15:00:00Z",
      season: "10.5",
      mode: null,
      map: null,
      category: "Competitive",
      result,
      score: null,
      kills: 0,
      deaths: 0,
      assists: 0,
      kda: null,
      mvp: false,
      svp: false,
      leftGame: false,
      rankChange: change,
      rankAfter: { name: "Gold III", score: 50, ladder },
      device: "pc",
      durationSeconds: 600,
    };
  }

  it("charts oldest first and sums the change, skipping unranked matches", () => {
    const rows = [
      ranked("win", 20, 130, "c"),
      ranked("win", 15, 110, "b"),
      { ...ranked("loss", 0, 0, "quick"), rankChange: null, rankAfter: null },
      ranked("loss", -15, 95, "a"),
    ];

    expect(rankTrend(rows)).toEqual({
      points: [
        { ladder: 95, result: "loss", matchUid: "a", continues: false },
        { ladder: 110, result: "win", matchUid: "b", continues: true },
        { ladder: 130, result: "win", matchUid: "c", continues: true },
      ],
      net: 20,
      wins: 2,
      losses: 1,
      streak: { result: "win", count: 2 },
    });
  });

  it("stops a streak at a draw and has none when the latest match was a draw", () => {
    const draw = ranked("draw", 0, 100, "d");

    expect(rankTrend([ranked("win", 10, 120, "w"), draw]).streak).toEqual({
      result: "win",
      count: 1,
    });
    expect(rankTrend([draw, ranked("win", 10, 90, "w")]).streak).toBeNull();
  });

  it("marks where the rank score didn't carry over, as at a season reset", () => {
    const beforeReset = ranked("win", 10, 5000, "old");
    const afterReset = ranked("win", 10, 120, "new");

    expect(rankTrend([afterReset, beforeReset]).points.map((p) => p.continues)).toEqual([
      false,
      false,
    ]);
  });

  it("has no streak or points without ranked matches", () => {
    expect(rankTrend([])).toEqual({ points: [], net: 0, wins: 0, losses: 0, streak: null });
  });
});
