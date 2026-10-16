import type { MatchState } from "@/domain/matchState";
import type { Match } from "@/domain/model";

export interface ScoreToast {
  matchId: string;
  title: string;
  description: string;
  status: "loading" | "info" | "success";
}

function teamLabel(match: Match, side: 1 | 2) {
  return (side === 1 ? match.team1?.short : match.team2?.short) ?? "TBD";
}

export function scoreToasts(
  matches: Match[],
  before: ReadonlyMap<string, MatchState>,
  after: ReadonlyMap<string, MatchState>,
  hidden: boolean,
): ScoreToast[] {
  const toasts: ScoreToast[] = [];
  for (const match of matches) {
    const prev = before.get(match.id);
    const next = after.get(match.id);
    if (!prev || !next) continue;
    const pairing = `${teamLabel(match, 1)} vs ${teamLabel(match, 2)}`;
    const score = `${teamLabel(match, 1)} ${next.wins1}–${next.wins2} ${teamLabel(match, 2)}`;
    const newMap = next.playedMaps.length > prev.playedMaps.length;
    const toast = (title: string, description: string, status: ScoreToast["status"]) =>
      toasts.push({ title, description, status, matchId: match.id });

    if (next.status === "live" && prev.status === "upcoming") {
      toast("Match is live", `${pairing} · ${match.round}`, "loading");
    } else if (hidden) {
      if (newMap) toast("Score update", pairing, "info");
    } else if (next.winner !== 0 && prev.winner === 0) {
      toast(`${teamLabel(match, next.winner)} win the series`, score, "success");
    } else if (newMap) {
      const map = next.playedMaps.at(-1);
      if (!map || map.winner === 0) continue;
      toast(`${teamLabel(match, map.winner)} take ${map.map || `Map ${map.index}`}`, score, "info");
    }
  }
  return toasts;
}
