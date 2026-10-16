export interface Team {
  name: string;
  short: string;
}

export interface MapResult {
  index: number;
  map: string;
  score1: number | null;
  score2: number | null;
  winner: 0 | 1 | 2;
  vod: string | null;
}

export interface Match {
  id: string;
  eventId: string;
  phase: string;
  round: string;
  bestOf: number;
  startsAt: string | null;
  team1: Team | null;
  team2: Team | null;
  maps: MapResult[];
  /** Liquipedia's explicit finished/walkover flag; score-based completion is derived in `matchState`. */
  markedFinished: boolean;
  twitch: string | null;
  youtube: string | null;
}

export interface IgniteEvent {
  id: string;
  name: string;
  ticker: string;
  region: string;
  stage: string;
  startDate: string | null;
  endDate: string | null;
  prizePoolUsd: number | null;
  liquipediaUrl: string;
  updatedAt: string;
}

export interface TeamInfo {
  short: string;
  logoDark: string | null;
  logoLight: string | null;
}

export interface PageData {
  revid: number;
  updatedAt: string;
  event: IgniteEvent | null;
  matches: Match[];
}

export interface StoredSnapshot {
  pages: Record<string, PageData>;
  teams: Record<string, TeamInfo>;
  builtAt: string;
}

export interface Snapshot {
  builtAt: string;
  servedAt: string;
  liquipediaUpdatedAt: string | null;
  events: IgniteEvent[];
  matches: Match[];
  teams: Record<string, TeamInfo>;
}

export type MatchStatus = "upcoming" | "live" | "finished";

export interface MatchState {
  status: MatchStatus;
  wins1: number;
  wins2: number;
  winner: 0 | 1 | 2;
  playedMaps: MapResult[];
}

const LIVE_WINDOW_MS = 6 * 60 * 60 * 1000;

export function matchState(match: Match, now: number = Date.now()): MatchState {
  const playedMaps = match.maps.filter((m) => m.winner !== 0);
  const wins1 = playedMaps.filter((m) => m.winner === 1).length;
  const wins2 = playedMaps.filter((m) => m.winner === 2).length;
  const needed = Math.ceil(match.bestOf / 2);
  const winner: 0 | 1 | 2 = wins1 >= needed ? 1 : wins2 >= needed ? 2 : 0;
  if (winner || match.markedFinished)
    return { status: "finished", wins1, wins2, winner, playedMaps };

  const start = match.startsAt ? Date.parse(match.startsAt) : NaN;
  const started = playedMaps.length > 0 || (!Number.isNaN(start) && start <= now);
  const bothTeams = match.team1 !== null && match.team2 !== null;
  // Old series Liquipedia never completed (missing map results) shouldn't sit in "Live" forever.
  if (!Number.isNaN(start) && now - start > LIVE_WINDOW_MS && bothTeams) return { status: "finished", wins1, wins2, winner, playedMaps };
  const status: MatchStatus = started && bothTeams ? "live" : "upcoming";
  return { status, wins1, wins2, winner, playedMaps };
}
