import type { MatchState } from "@/domain/matchState";
import { matchView, type MatchView } from "@/domain/matchView";
import type { Match } from "@/domain/model";

export interface ScoreToast {
  matchId: string;
  title: string;
  description: string;
  status: "loading" | "info" | "success";
}

function sideOf(view: MatchView, side: 1 | 2) {
  return side === 1 ? view.side1 : view.side2;
}

export function scoreToasts(
  matches: Match[],
  before: ReadonlyMap<string, MatchState>,
  after: ReadonlyMap<string, MatchState>,
  hidden: boolean,
  now: number,
): ScoreToast[] {
  const bracket = { matches, now };
  const toasts: ScoreToast[] = [];

  for (const match of matches) {
    const prev = before.get(match.id);
    const next = after.get(match.id);

    if (!prev || !next) continue;
    const prevView = matchView(match, prev, hidden, bracket);
    const nextView = matchView(match, next, hidden, bracket);
    const { side1, side2 } = nextView;
    const pairing = `${side1.short} vs ${side2.short}`;
    const score = `${side1.short} ${side1.score ?? ""}–${side2.score ?? ""} ${side2.short}`;
    const newMap = next.playedMaps.length > prev.playedMaps.length;
    const latest = next.playedMaps.at(-1);
    const latestSlot = nextView.maps.find((m) => m.index === latest?.index);

    const toast = (title: string, description: string, status: ScoreToast["status"]) =>
      toasts.push({ title, description, status, matchId: match.id });

    if (nextView.status === "live" && prevView.status === "upcoming") {
      toast("Match is live", `${pairing} · ${match.round}`, "loading");
    } else if (nextView.winner !== null && prevView.winner === null) {
      toast(`${sideOf(nextView, nextView.winner).short} win the series`, score, "success");
    } else if (newMap && latestSlot?.kind === "played") {
      const map = latestSlot.map ?? `Map ${latestSlot.index}`;
      toast(`${sideOf(nextView, latestSlot.winner).short} take ${map}`, score, "info");
    } else if (newMap) {
      toast("Score update", pairing, "info");
    }
  }

  return toasts;
}
