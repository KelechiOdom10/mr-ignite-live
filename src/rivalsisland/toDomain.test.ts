import { describe, expect, it } from "vitest";

import { groupBySeason, seasonRecord, UidSchema } from "@/domain/player";

import { rivalsIslandFixture, RECORDED_UIDS } from "../../test/fakeRivalsIsland";
import { CareerResponseSchema, MatchDetailSchema, MatchHistoryResponseSchema } from "./schemas";
import { toCareer, toHistoryPage, toMatchDetail, toPlayerCard, toProfile } from "./toDomain";

describe("toMatchDetail", () => {
  it("splits the recorded match into its two teams with each player's most-played hero first", () => {
    const match = toMatchDetail(
      MatchDetailSchema.parse(rivalsIslandFixture("match-detail")),
      new Map(),
    );

    expect(match.teams.map((t) => [t.id, t.result, t.players.length])).toEqual([
      [1, "loss", 6],
      [0, "win", 6],
    ]);
    const sypeh = match.teams[1]?.players.find((p) => p.uid === RECORDED_UIDS.sypeh);
    expect(sypeh?.heroes[0]?.name).toBe("Invisible Woman");

    for (const p of match.teams.flatMap((t) => t.players)) {
      const times = p.heroes.map((h) => h.playSeconds);
      expect(times).toEqual([...times].sort((a, b) => b - a));
    }

    expect(match.draft.filter((d) => d.action === "ban")).toHaveLength(6);
  });
});

describe("season scope", () => {
  const freshness = { fetchedAt: 0, stale: false };

  it("splits Sypeh's history at the 10.5 reset: one match this season, 19 from 10.0", () => {
    const page = toHistoryPage(
      MatchHistoryResponseSchema.parse(rivalsIslandFixture("history-sypeh")),
      freshness,
    );

    expect(groupBySeason(page.rows).map((g) => [g.season, g.rows.length])).toEqual([
      ["10.5", 1],
      ["10.0", 19],
    ]);
  });

  it("gives Sypeh's single 10.5 match no win rate, but TrqstMe's 58 a real one", () => {
    const sypeh = toProfile(
      CareerResponseSchema.parse(rivalsIslandFixture("career-sypeh")),
      new Map(),
    );

    expect(seasonRecord(sypeh)).toEqual({ kind: "few", season: "10.5", matches: 1, wins: 1 });

    const trqstMe = toProfile(
      CareerResponseSchema.parse(rivalsIslandFixture("player-career")),
      new Map(),
    );

    expect(seasonRecord(trqstMe)).toMatchObject({ kind: "enough", matches: 58, wins: 37 });
  });
});

describe("rank and platform per match", () => {
  it("keeps the rank after each of Sypeh's matches and the platform it was played on", () => {
    const [latest] = toHistoryPage(
      MatchHistoryResponseSchema.parse(rivalsIslandFixture("history-sypeh")),
      { fetchedAt: 0, stale: false },
    ).rows;

    expect(latest).toMatchObject({
      device: "pc",
      rankAfter: { name: "One Above All", score: 204 },
    });
    expect(latest?.rankAfter?.ladder).toBeCloseTo(5304.56, 1);
  });

  it("carries the career bests the player page leads with", () => {
    const career = toCareer(CareerResponseSchema.parse(rivalsIslandFixture("career-sypeh")));

    expect(career).toMatchObject({ headshotKills: 1019, soloKills: 3136, bestKillStreak: 28 });
  });
});

describe("toPlayerCard", () => {
  const saved = { uid: UidSchema.parse("670067075"), name: "Sypeh (saved)" };

  it("builds a favourite's card from cached career and history", () => {
    const card = toPlayerCard(
      saved,
      CareerResponseSchema.parse(rivalsIslandFixture("career-sypeh")),
      MatchHistoryResponseSchema.parse(rivalsIslandFixture("history-sypeh")),
    );

    expect(card).toMatchObject({
      name: "Sypeh",
      club: "VP",
      device: "pc",
      rank: { name: "One Above All", score: 204 },
      form: ["win", "win", "win", "loss", "win"],
    });
  });

  it("falls back to the saved name when nothing is cached", () => {
    expect(toPlayerCard(saved, null, null)).toEqual({
      ...saved,
      iconUrl: null,
      club: null,
      rank: null,
      device: null,
      form: [],
    });
  });
});
