import type { IgniteEvent, MapResult, Match } from "@/domain/model";

export function anEvent(overrides: Partial<IgniteEvent> = {}): IgniteEvent {
  return {
    id: "MR Ignite/2026/Grand Finals",
    name: "Marvel Rivals Ignite 2026: Grand Finals",
    ticker: "Grand Finals",
    region: "Global",
    stage: "Grand Finals",
    startDate: "2026-11-23",
    endDate: "2026-11-29",
    prizePoolUsd: null,
    prizes: [],
    liquipediaUrl: "https://liquipedia.net/marvelrivals/MR_Ignite/2026/Grand_Finals",
    updatedAt: "2026-11-19T12:00:00.000Z",
    iconFile: null,
    iconUrl: null,
    ...overrides,
  };
}

export function aMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: "bracket_R1M1",
    eventId: "MR Ignite/2026/Stage 2/Americas",
    phase: "Playoffs",
    round: "Upper Bracket Quarterfinals",
    bestOf: 5,
    startsAt: "2026-10-16T20:00:00.000Z",
    team1: { name: "Liquid Citadel", short: "TLC" },
    team2: { name: "Swamp Gaming", short: "SG" },
    maps: [],
    markedFinished: false,
    twitch: null,
    youtube: null,
    ...overrides,
  };
}

export function aMap(index: number, winner: MapResult["winner"]): MapResult {
  return { index, map: `Map ${index}`, score1: null, score2: null, winner, vod: null };
}
