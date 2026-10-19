import type { MapResult, MapWinner, Match } from "./model";

export type MatchStatus = "upcoming" | "live" | "finished";

export type FinishedBy = "maps" | "walkover" | "marked" | "abandoned";

export interface MatchState {
  status: MatchStatus;
  finishedBy: FinishedBy | null;
  wins1: number;
  wins2: number;
  winner: MapWinner;
  playedMaps: MapResult[];
}

export const LIVE_WINDOW_MS = 6 * 60 * 60 * 1000;

export function matchState(match: Match, now: number): MatchState {
  const playedMaps = match.maps.filter((m) => m.winner !== 0);
  const wins1 = playedMaps.filter((m) => m.winner === 1).length;
  const wins2 = playedMaps.filter((m) => m.winner === 2).length;
  const needed = Math.ceil(match.bestOf / 2);
  const winner: MapWinner = wins1 >= needed ? 1 : wins2 >= needed ? 2 : 0;

  const finished = (finishedBy: FinishedBy): MatchState => ({
    status: "finished",
    finishedBy,
    wins1,
    wins2,
    winner,
    playedMaps,
  });

  if (winner !== 0) return finished("maps");

  if (match.markedFinished) return finished(playedMaps.length === 0 ? "walkover" : "marked");

  const start = match.startsAt ? Date.parse(match.startsAt) : Number.NaN;
  const hasStart = !Number.isNaN(start);
  const bothTeams = match.team1 !== null && match.team2 !== null;
  const abandoned = hasStart && bothTeams && now - start > LIVE_WINDOW_MS;

  if (abandoned) return finished("abandoned");

  const started = playedMaps.length > 0 || (hasStart && start <= now);

  return {
    status: started && bothTeams ? "live" : "upcoming",
    finishedBy: null,
    wins1,
    wins2,
    winner,
    playedMaps,
  };
}
