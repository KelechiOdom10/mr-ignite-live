import { describe, expect, it } from "vitest";

import { recentHeroes, UidSchema, type MatchDetail, type MatchPlayer } from "./player";

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
