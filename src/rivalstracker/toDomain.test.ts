import { describe, expect, it } from "vitest";

import { UidSchema } from "@/domain/player";

import {
  fakeRivalsTracker,
  RECORDED_UIDS,
  rivalsTrackerFixture,
} from "../../test/fakeRivalsTracker";
import {
  FindPlayerResponseSchema,
  LeaderboardResponseSchema,
  MatchResponseSchema,
  PlayerResponseSchema,
} from "./schemas";
import {
  toCareer,
  toHeroCareer,
  toHistoryPage,
  toLeaderboard,
  toMatchDetail,
  toPlayerCard,
  toProfile,
  toSearchPlayer,
} from "./toDomain";

const sypeh = UidSchema.parse(RECORDED_UIDS.sypeh);
const fresh = { fetchedAt: 1, stale: false };

const sypehRes = PlayerResponseSchema.parse(rivalsTrackerFixture("player-sypeh"));
const trqstMeRes = PlayerResponseSchema.parse(rivalsTrackerFixture("player-trqstme"));
const matchRes = MatchResponseSchema.parse(rivalsTrackerFixture("match-detail"));
const boardRes = LeaderboardResponseSchema.parse(rivalsTrackerFixture("leaderboard-pc"));

describe("recorded player to our domain", () => {
  it("maps Sypeh's profile, current season rank and peak", () => {
    const profile = toProfile(sypehRes);

    expect(profile.uid).toBe(sypeh);
    expect(profile.name).toBe("Sypeh");
    expect(profile.level).toBe(84);
    expect(profile.club).toBe("VP");
    expect(profile.iconUrl).toBe(
      "https://rivalstracker.com/images/Playerhead/img_playerhead_31031213.png",
    );
    expect(profile.season).toBe("10.5");
    expect(profile.rank).toEqual({ name: "One Above All", level: 23, score: 5358.363715283483 });
    expect(profile.peakRank.name).toBe("One Above All");
    expect(profile.seasonWins).toBe(18);
    expect(profile.seasonMatches).toBe(28);
    expect(profile.signatureHero).toBeNull();
    expect(profile.lastOnline).toBeNull();
  });

  it("sums ranked and unranked career totals and leaves fields the site omits empty", () => {
    const career = toCareer(sypehRes);

    expect(career.matches).toBe(74);
    expect(career.wins).toBe(57);
    expect(career.kills).toBe(435);
    expect(career.deaths).toBe(97);
    expect(career.assists).toBe(626);
    expect(career.playSeconds).toBeCloseTo(19669.08, 2);
    expect(career.kda).toBeCloseTo((435 + 626) / 97, 6);
    expect(career.winRate).toBeCloseTo(57 / 74, 6);
    expect(career.damage).toBeNull();
    expect(career.healing).toBeNull();
    expect(career.accuracy).toBeNull();
    expect(career.mvp).toBeNull();
  });

  it("keeps a private history visible as a state, not a fabricated empty career", () => {
    expect(trqstMeRes.visibility.match_history).toBe(false);
    expect(trqstMeRes.match_history).toHaveLength(0);
    expect(toProfile(trqstMeRes).name).toBe("NAVI TrqstMe");
    expect(toCareer(trqstMeRes).matches).toBe(100);
  });

  it("maps history rows with season, map, score, result and rank change", () => {
    const page = toHistoryPage(sypehRes, fresh);
    const first = page.rows[0];

    expect(page.rows).toHaveLength(20);
    expect(first?.matchUid).toBe("4964445_1793847522_1272487_11001_12");
    expect(first?.season).toBe("10.5");
    expect(first?.map).toBe("Intergalactic Empire of Wakanda");
    expect(first?.mode).toBe("Competitive");
    expect(first?.result).toBe("win");
    expect(first?.score).toEqual({ us: 2, them: 0 });
    expect(first?.mvp).toBe(true);
    expect(first?.rankChange).toBeCloseTo(16.272, 3);
    expect(first?.rankAfter?.name).toBe("One Above All");
    expect(first?.leftGame).toBe(false);
    expect(page.hasMore).toBe(false);
  });

  it("reads a hero card from the same player response, and says when a hero has none", () => {
    const card = toHeroCareer(sypehRes, 1016, fresh);

    expect(card?.hero.name).toBe("Loki");
    expect(card?.matches).toBe(6);
    expect(card?.winRate).toBeCloseTo(3 / 6, 6);
    expect(card?.playSeconds).toBeCloseTo(4686.7587, 2);
    expect(toHeroCareer(sypehRes, 9999, fresh)).toBeNull();
  });

  it("maps the single-name search and its miss", () => {
    const hit = toSearchPlayer(
      FindPlayerResponseSchema.parse(rivalsTrackerFixture("search-sypeh")),
    );

    const miss = toSearchPlayer(
      FindPlayerResponseSchema.parse(rivalsTrackerFixture("search-miss")),
    );

    expect(hit).toMatchObject({ uid: sypeh, name: "Sypeh" });
    expect(miss).toBeNull();
  });

  it("builds a list card from the cached player response", () => {
    const card = toPlayerCard({ uid: sypeh, name: "old name" }, sypehRes);

    expect(card.name).toBe("Sypeh");
    expect(card.rank?.name).toBe("One Above All");
    expect(card.form).toHaveLength(5);
  });
});

describe("recorded match to our domain", () => {
  it("maps both camps, the MVP flag and per-player hero time", () => {
    const match = toMatchDetail(matchRes);

    expect(match.teams).toHaveLength(2);
    expect(match.teams.flatMap((t) => t.players)).toHaveLength(12);
    expect(match.teams.find((t) => t.result === "win")?.id).toBe(0);
    expect(match.teams.find((t) => t.result === "loss")?.id).toBe(1);
    const mvp = match.teams.flatMap((t) => t.players).find((p) => p.mvp);
    expect(mvp?.name).toBe("Neuse_");
    expect(mvp?.heroes[0]?.name).toBe("Psylocke");
    expect(match.map).toBeNull();
    expect(match.season).toBeNull();
    expect(match.teams[0]?.score).toBeNull();
  });

  it("keeps the recorded bans in draft order with their hero names", () => {
    const match = toMatchDetail(matchRes);

    expect(match.draft).toHaveLength(6);
    expect(match.draft.map((d) => d.action)).toEqual(["ban", "ban", "ban", "ban", "ban", "ban"]);
    expect(match.draft.map((d) => [d.round, d.teamId, d.hero?.name])).toEqual([
      [0, 0, "Devil Dinosaur"],
      [1, 1, "Gambit"],
      [2, 1, "Phoenix"],
      [3, 0, "Hela"],
      [4, 0, "Elsa Bloodstone"],
      [5, 1, "Emma Frost"],
    ]);
  });
});

describe("recorded leaderboard to our domain", () => {
  it("orders rows by the response, labels the season and leaves last-played unknown", () => {
    const board = toLeaderboard(boardRes, "pc", fresh);

    expect(board.season).toBe("10.5");
    expect(board.device).toBe("pc");
    expect(board.rows).toHaveLength(100);
    expect(board.rows[0]).toMatchObject({
      position: 1,
      uid: "1602282958",
      name: "MACE",
      matches: 292,
    });
    expect(board.rows[0]?.rank).toEqual({
      name: "One Above All",
      level: 23,
      score: 5456.2935518521,
    });
    expect(board.rows[0]?.winRate).toBeCloseTo(174 / 292, 6);
    expect(board.rows[0]?.lastPlayedAt).toBeNull();
  });
});

describe("fake transport", () => {
  it("records the method and path so a test can prove what was called", async () => {
    const fake = fakeRivalsTracker();
    await fake.fetch("https://api.rivalstracker.com/api/player/670067075");

    expect(fake.calls).toEqual(["GET /player/670067075"]);
  });
});
