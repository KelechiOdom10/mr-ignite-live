import { describe, expect, it } from "vitest";

import {
  groupBySeason,
  MIN_MATCHES_FOR_WIN_RATE,
  recentHeroes,
  seasonRecord,
  UidSchema,
  type HistoryRow,
  type MatchDetail,
  type MatchPlayer,
  type PlayerProfile,
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
