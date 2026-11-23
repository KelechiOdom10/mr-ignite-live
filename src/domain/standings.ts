import { matchState } from "./matchState";
import type { Group, Match, Team } from "./model";

export const GROUP_STAGE = "Group Stage";

// 2^remaining outcomes are tried to find who is already through or out; a bigger group skips that.
const MAX_REMAINING_FOR_CERTAINTY = 20;

export interface StandingRow {
  team: Team;
  /** Teams level on every tiebreaker share a place. */
  place: number;
  seriesWins: number;
  seriesLosses: number;
  mapWins: number;
  mapLosses: number;
  mapDiff: number;
  live: boolean;
  /** Set only when no remaining result can change it. */
  status: "through" | "out" | null;
  tiedWith: string[];
  /** The round of the unplayed series between the tied teams, when there is one. */
  tiebreakRound: string | null;
}

export interface GroupTable {
  group: Group;
  rows: StandingRow[];
}

interface Tally {
  team: Team;
  seriesWins: number;
  seriesLosses: number;
  mapWins: number;
  mapLosses: number;
  live: boolean;
}

interface Result {
  winner: string;
  loser: string;
}

export function containerOf(match: Match): string {
  return match.id.slice(0, match.id.lastIndexOf("_"));
}

function standingsKey(t: Tally): number {
  return t.seriesWins * 1000 - t.seriesLosses;
}

function headToHead(team: string, among: ReadonlySet<string>, results: readonly Result[]): number {
  return results.filter((r) => r.winner === team && among.has(r.loser)).length;
}

function certainty(
  tallies: readonly Tally[],
  remaining: readonly Match[],
  advance: number,
): Map<string, "through" | "out"> {
  const status = new Map<string, "through" | "out">();

  if (remaining.length > MAX_REMAINING_FOR_CERTAINTY) return status;

  const names = tallies.map((t) => t.team.name);
  const best = new Map(names.map((n) => [n, Infinity]));
  const worst = new Map(names.map((n) => [n, 0]));

  for (let mask = 0; mask < 1 << remaining.length; mask++) {
    const wins = new Map(tallies.map((t) => [t.team.name, t.seriesWins]));

    remaining.forEach((m, i) => {
      const winner = mask & (1 << i) ? m.team1?.name : m.team2?.name;

      if (winner) wins.set(winner, (wins.get(winner) ?? 0) + 1);
    });

    for (const n of names) {
      const mine = wins.get(n) ?? 0;
      const others = names.flatMap((o) => (o === n ? [] : [wins.get(o) ?? 0]));

      best.set(n, Math.min(best.get(n) ?? Infinity, others.filter((w) => w > mine).length + 1));
      worst.set(n, Math.max(worst.get(n) ?? 0, others.filter((w) => w >= mine).length + 1));
    }
  }

  for (const n of names) {
    if ((worst.get(n) ?? Infinity) <= advance) status.set(n, "through");
    else if ((best.get(n) ?? 0) > advance) status.set(n, "out");
  }

  return status;
}

function tableFor(group: Group, matches: readonly Match[], now: number): GroupTable {
  const inGroup = matches.filter(
    (m) =>
      m.eventId === group.eventId &&
      m.phase === GROUP_STAGE &&
      group.matchGroups.includes(containerOf(m)),
  );

  const tallies = new Map<string, Tally>();
  const results: Result[] = [];
  const remaining: Match[] = [];

  const tally = (team: Team): Tally => {
    const existing = tallies.get(team.name);

    if (existing) return existing;
    const created = { team, seriesWins: 0, seriesLosses: 0, mapWins: 0, mapLosses: 0, live: false };
    tallies.set(team.name, created);

    return created;
  };

  for (const m of inGroup) {
    if (!m.team1 || !m.team2) continue;

    const a = tally(m.team1);
    const b = tally(m.team2);
    const state = matchState(m, now);

    if (state.status !== "finished") remaining.push(m);

    if (state.status === "live") {
      a.live = true;
      b.live = true;
    }

    if (state.status !== "finished" || state.winner === 0) continue;

    const [won, lost] = state.winner === 1 ? [a, b] : [b, a];

    const [wonMaps, lostMaps] =
      state.winner === 1 ? [state.wins1, state.wins2] : [state.wins2, state.wins1];

    won.seriesWins++;
    lost.seriesLosses++;
    won.mapWins += wonMaps;
    won.mapLosses += lostMaps;
    lost.mapWins += lostMaps;
    lost.mapLosses += wonMaps;
    results.push({ winner: won.team.name, loser: lost.team.name });
  }

  const ordered = [...tallies.values()].toSorted((a, b) => standingsKey(b) - standingsKey(a));
  const decided = certainty(ordered, remaining, group.advance);
  const rows: StandingRow[] = [];

  const levels: Tally[][] = [];

  for (const t of ordered) {
    const current = levels.at(-1);

    if (current?.[0] && standingsKey(current[0]) === standingsKey(t)) current.push(t);
    else levels.push([t]);
  }

  for (const level of levels) {
    const first = rows.length;
    const levelNames = new Set(level.map((t) => t.team.name));

    const h2h = new Map(
      level.map((t) => [t.team.name, headToHead(t.team.name, levelNames, results)]),
    );

    const diff = (t: Tally) => t.mapWins - t.mapLosses;

    const sorted = level.toSorted(
      (a, b) => (h2h.get(b.team.name) ?? 0) - (h2h.get(a.team.name) ?? 0) || diff(b) - diff(a),
    );

    let place = first + 1;

    sorted.forEach((t, i) => {
      const prev = sorted[i - 1];

      if (!prev || h2h.get(prev.team.name) !== h2h.get(t.team.name) || diff(prev) !== diff(t)) {
        place = first + i + 1;
      }

      rows.push({
        team: t.team,
        place,
        seriesWins: t.seriesWins,
        seriesLosses: t.seriesLosses,
        mapWins: t.mapWins,
        mapLosses: t.mapLosses,
        mapDiff: diff(t),
        live: t.live,
        status: decided.get(t.team.name) ?? null,
        tiedWith: [],
        tiebreakRound: null,
      });
    });
  }

  for (const row of rows) {
    const level = rows.filter((r) => r.place === row.place);

    if (level.length < 2) continue;
    const names = new Set(level.map((r) => r.team.name));

    row.tiedWith = level.flatMap((r) => (r === row ? [] : [r.team.name]));

    row.tiebreakRound =
      remaining.find(
        (m) => m.team1 && m.team2 && names.has(m.team1.name) && names.has(m.team2.name),
      )?.round ?? null;
  }

  if (remaining.length === 0) {
    for (const row of rows) {
      if (row.place + row.tiedWith.length <= group.advance) row.status = "through";
      else if (row.place > group.advance) row.status = "out";
    }
  }

  return { group, rows };
}

export function groupTables(
  groups: readonly Group[],
  matches: readonly Match[],
  now: number,
): GroupTable[] {
  return groups.map((group) => tableFor(group, matches, now));
}
