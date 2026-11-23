import { describe, expect, it } from "vitest";

import { type Group, type Match, type MapWinner } from "./model";
import { GROUP_STAGE, groupTables } from "./standings";

describe("groupTables certainty", () => {
  const group: Group = { eventId: "e", title: "Group X", matchGroups: ["list"], advance: 2 };
  const team = (name: string) => ({ name, short: name });

  function series(n: number, t1: string, t2: string, winner: 0 | 1 | 2): Match {
    const wins: MapWinner[] = winner === 0 ? [] : [winner, winner];

    return {
      id: `list_M${n}`,
      eventId: "e",
      phase: GROUP_STAGE,
      round: "Day 1",
      bestOf: 3,
      startsAt: "2026-11-23T10:00:00.000Z",
      team1: team(t1),
      team2: team(t2),
      maps: wins.map((w, i) => ({
        index: i + 1,
        map: "",
        score1: null,
        score2: null,
        winner: w,
        vod: null,
      })),
      markedFinished: false,
      twitch: null,
      youtube: null,
    };
  }

  const fixtures = [
    series(1, "A", "B", 1),
    series(2, "A", "C", 1),
    series(3, "A", "D", 1),
    series(4, "B", "C", 1),
  ];

  const status = (matches: Match[]) =>
    Object.fromEntries(
      (groupTables([group], matches, Date.parse("2026-11-23T10:30:00Z"))[0]?.rows ?? []).map(
        (r) => [r.team.name, r.status],
      ),
    );

  it("marks a team through only once no result left can drop it below the cutoff", () => {
    expect(status([...fixtures, series(5, "B", "D", 1), series(6, "C", "D", 1)])).toEqual({
      A: "through",
      B: "through",
      C: "out",
      D: "out",
    });
  });

  it("marks a team out only once it can no longer reach the cutoff, not before", () => {
    expect(status([...fixtures, series(5, "B", "D", 0), series(6, "C", "D", 0)])).toEqual({
      A: "through",
      B: null,
      C: null,
      D: null,
    });
  });
});
