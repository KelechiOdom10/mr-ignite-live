import { matchState, type MatchState } from "./matchState";
import type { MapResult, Match, Team } from "./model";

export type SideOutcome = "won" | "lost" | "open";
export type Side = 1 | 2;

export interface SideView {
  team: Team | null;
  name: string;
  short: string;
  score: number | null;
  outcome: SideOutcome;
}

export type MapSlotView =
  | { kind: "hidden"; index: number }
  | { kind: "current"; index: number; map: string | null }
  | { kind: "open"; index: number; map: string | null }
  | {
      kind: "played";
      index: number;
      map: string | null;
      winner: Side;
      winnerScore: number | null;
      loserScore: number | null;
    };

export interface VodLink {
  index: number;
  url: string;
  label: string;
}

export type StatusText = "Live" | "Final" | "Walkover" | "No result" | null;

export interface MatchView {
  status: MatchState["status"];
  statusText: StatusText;
  side1: SideView;
  side2: SideView;
  winner: Side | null;
  maps: MapSlotView[];
  vods: VodLink[];
  revealed: boolean;
  summary: string;
}

export interface Feeder {
  result: "Winner" | "Loser" | "From";
  round: string;
}

export type SlotFeeders = Partial<Record<Side, Feeder>>;

export function matchView(
  match: Match,
  state: MatchState,
  hidden: boolean,
  feeders: SlotFeeders = {},
): MatchView {
  const revealed = !hidden;
  const unplayed = state.status === "finished" && state.playedMaps.length === 0;
  const scored = revealed && state.status !== "upcoming" && !unplayed;
  const winner = revealed && state.winner !== 0 ? state.winner : null;
  const side = (n: Side): SideView => {
    const team = n === 1 ? match.team1 : match.team2;
    const score = scored ? (n === 1 ? state.wins1 : state.wins2) : null;
    const outcome = winner === null ? "open" : winner === n ? "won" : "lost";
    const feeder = hidden ? feeders[n] : undefined;
    if (team && feeder) {
      const lead = feeder.result === "From" ? "From" : `${feeder.result} of`;
      return {
        team: null,
        name: `${lead} ${feeder.round}`,
        short: `${lead} ${abbreviateRound(feeder.round)}`,
        score,
        outcome,
      };
    }
    return { team, name: team?.name ?? "TBD", short: team?.short ?? "TBD", score, outcome };
  };
  const side1 = side(1);
  const side2 = side(2);
  const statusText = statusTextOf(state, revealed);
  return {
    status: state.status,
    statusText,
    side1,
    side2,
    winner,
    maps: mapSlots(match, state, revealed),
    vods: vodLinks(match, revealed),
    revealed,
    summary: summaryOf(match, side1, side2, statusText),
  };
}

function statusTextOf(state: MatchState, revealed: boolean): StatusText {
  if (state.status === "live") return "Live";
  if (state.status === "upcoming") return null;
  if (!revealed) return "Final";
  if (state.finishedBy === "walkover") return "Walkover";
  if (state.finishedBy === "abandoned") return "No result";
  return "Final";
}

function summaryOf(match: Match, side1: SideView, side2: SideView, statusText: StatusText) {
  const pairing = `${side1.name} vs ${side2.name}`;
  if (statusText === "Walkover" || statusText === "No result")
    return `${pairing}, ${statusText.toLowerCase()}, ${match.round}`;
  if (side1.score === null || side2.score === null || statusText === null)
    return `${pairing}, ${match.round}`;
  return `${side1.name} ${side1.score}, ${side2.name} ${side2.score}, ${statusText.toLowerCase()}, ${match.round}`;
}

function mapSlots(match: Match, state: MatchState, revealed: boolean): MapSlotView[] {
  const current = state.status === "live" ? state.playedMaps.length + 1 : -1;
  return Array.from({ length: match.bestOf }, (_, i): MapSlotView => {
    const index = i + 1;
    if (!revealed) return { kind: "hidden", index };
    const result: MapResult | undefined = match.maps.find((m) => m.index === index);
    const map = result?.map || null;
    if (index === current) return { kind: "current", index, map };
    if (!result || result.winner === 0) return { kind: "open", index, map };
    const own = result.winner === 1 ? result.score1 : result.score2;
    const other = result.winner === 1 ? result.score2 : result.score1;
    return {
      kind: "played",
      index,
      map,
      winner: result.winner,
      winnerScore: own,
      loserScore: other,
    };
  });
}

function vodLinks(match: Match, revealed: boolean): VodLink[] {
  const withVod = match.maps.flatMap((m) => (m.vod ? [{ index: m.index, url: m.vod }] : []));
  if (revealed) return withVod.map((v) => ({ ...v, label: `Map ${v.index}` }));
  const alwaysPlayed = Math.ceil(match.bestOf / 2);
  const first = withVod.find((v) => v.index <= alwaysPlayed);
  return first ? [{ ...first, label: `Watch from map ${first.index}` }] : [];
}

function abbreviateRound(round: string): string {
  return round.replace(/\bUpper Bracket\b/i, "UB").replace(/\bLower Bracket\b/i, "LB");
}

function bracketOf(match: Match): string {
  return `${match.eventId}|${match.id.slice(0, match.id.lastIndexOf("_"))}`;
}

function roundNumber(match: Match): number {
  const r = /_R(\d+)M\d+$/.exec(match.id);
  return r ? Number(r[1]) : Number.NaN;
}

function playedBefore(earlier: Match, later: Match): boolean {
  if (earlier.startsAt && later.startsAt)
    return Date.parse(earlier.startsAt) < Date.parse(later.startsAt);
  return roundNumber(earlier) < roundNumber(later);
}

// Read from team history: Liquipedia's slot ids don't say which upper-bracket loser drops
// into which lower-bracket slot.
export function bracketFeeders(matches: Match[], now: number): ReadonlyMap<string, SlotFeeders> {
  const finished = matches
    .map((m) => ({ m, s: matchState(m, now) }))
    .filter(({ s }) => s.status === "finished");
  const feeders = new Map<string, SlotFeeders>();
  for (const match of matches) {
    const slots: SlotFeeders = {};
    for (const n of [1, 2] as const) {
      const team = n === 1 ? match.team1 : match.team2;
      if (!team) continue;
      const previous = finished
        .filter(
          ({ m }) =>
            m.id !== match.id &&
            bracketOf(m) === bracketOf(match) &&
            (m.team1?.name === team.name || m.team2?.name === team.name) &&
            playedBefore(m, match),
        )
        .reduce<(typeof finished)[number] | undefined>(
          (latest, f) => (!latest || playedBefore(latest.m, f.m) ? f : latest),
          undefined,
        );
      if (!previous) continue;
      const side = previous.m.team1?.name === team.name ? 1 : 2;
      const result =
        previous.s.winner === 0 ? "From" : previous.s.winner === side ? "Winner" : "Loser";
      slots[n] = { result, round: previous.m.round };
    }
    if (slots[1] || slots[2]) feeders.set(match.id, slots);
  }
  return feeders;
}

const FORM_LENGTH = 10;

export interface FormResult {
  match: Match;
  won: boolean;
  opponent: Team | null;
  score: string;
}

export type FormView = { kind: "hidden" } | { kind: "shown"; results: FormResult[] };

function involves(match: Match, team: Team): boolean {
  return match.team1?.name === team.name || match.team2?.name === team.name;
}

export function formView(team: Team, matches: Match[], now: number, hidden: boolean): FormView {
  if (hidden) return { kind: "hidden" };
  const results = matches
    .filter((m) => involves(m, team) && m.startsAt)
    .map((m) => ({ m, s: matchState(m, now) }))
    .filter(({ s }) => s.status === "finished" && s.winner !== 0)
    .toSorted((a, b) => (a.m.startsAt ?? "").localeCompare(b.m.startsAt ?? ""))
    .slice(-FORM_LENGTH)
    .map(({ m, s }) => {
      const own = m.team1?.name === team.name ? 1 : 2;
      const mine = own === 1 ? s.wins1 : s.wins2;
      const theirs = own === 1 ? s.wins2 : s.wins1;
      return {
        match: m,
        won: s.winner === own,
        opponent: own === 1 ? m.team2 : m.team1,
        score: `${mine}–${theirs}`,
      };
    });
  return { kind: "shown", results };
}
