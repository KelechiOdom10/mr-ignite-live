import { matchState } from "./matchState";
import type { Group, Match, Team } from "./model";
import { teamKey } from "./teamIdentity";
import { teamShortName } from "./teams";

export const GROUP_STAGE = "Group Stage";

export const SUPPORTED_TIEBREAKERS = [
  "matchwins",
  "matchlosses",
  "h2hlegacy.matchwins",
  "gamediff",
];

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
  /** The round of the unplayed series between two tied teams, when there is one. */
  tiebreakRound: string | null;
}

export interface GroupTable {
  group: Group;
  /** False when the page ranks by rules we don't apply; the table is then left out. */
  supported: boolean;
  /** True when teams level on every tiebreaker share the cutoff. */
  cutoffTied: boolean;
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

interface Settled {
  side: 1 | 2;
  wins1: number;
  wins2: number;
}

export function containerOf(match: Match): string {
  return match.id.slice(0, match.id.lastIndexOf("_"));
}

/**
 * A series is settled by Liquipedia's own maps, or by an award the page names. The card's
 * timeout, a walkover with no named winner, a series marked finished midway, a result seen only
 * on mrvl and maps that give both sides a winning total are not results.
 */
function settled(match: Match): Settled | null {
  const played = match.maps.filter((m) => m.winner !== 0 && !m.early);
  const wins1 = played.filter((m) => m.winner === 1).length;
  const wins2 = played.filter((m) => m.winner === 2).length;
  const needed = Math.ceil(match.bestOf / 2);

  if (wins1 >= needed && wins2 >= needed) return null;

  if (wins1 >= needed) return { side: 1, wins1, wins2 };

  if (wins2 >= needed) return { side: 2, wins1, wins2 };

  if (match.markedFinished && match.awarded) return { side: match.awarded, wins1, wins2 };

  return null;
}

export function hasResult(match: Match): boolean {
  return settled(match) !== null;
}

function standingsKey(t: Tally): number {
  return t.seriesWins * 1000 - t.seriesLosses;
}

function headToHead(team: string, among: ReadonlySet<string>, results: readonly Result[]): number {
  return results.filter((r) => r.winner === team && among.has(r.loser)).length;
}

function certainty(
  tallies: readonly Tally[],
  remaining: readonly [string, string][],
  advance: number,
): Map<string, "through" | "out"> {
  const status = new Map<string, "through" | "out">();

  if (remaining.length > MAX_REMAINING_FOR_CERTAINTY) return status;

  const names = tallies.map((t) => teamKey(t.team.name));
  const best = new Map(names.map((n) => [n, Infinity]));
  const worst = new Map(names.map((n) => [n, 0]));

  for (let mask = 0; mask < 1 << remaining.length; mask++) {
    const wins = new Map(tallies.map((t) => [teamKey(t.team.name), t.seriesWins]));

    remaining.forEach(([first, second], i) => {
      const winner = mask & (1 << i) ? first : second;

      wins.set(winner, (wins.get(winner) ?? 0) + 1);
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
  const supported =
    group.tiebreakers.length === SUPPORTED_TIEBREAKERS.length &&
    SUPPORTED_TIEBREAKERS.every((rule, i) => rule === group.tiebreakers[i]);

  if (!supported) return { group, supported, cutoffTied: false, rows: [] };

  const inGroup = matches.filter(
    (m) =>
      m.eventId === group.eventId &&
      m.phase === GROUP_STAGE &&
      group.matchGroups.includes(containerOf(m)),
  );

  const tallies = new Map<string, Tally>(
    group.teams
      .flatMap((name) => (teamKey(name) === "" ? [] : [name]))
      .map((name) => [
        teamKey(name),
        {
          team: { name, short: teamShortName(name) },
          seriesWins: 0,
          seriesLosses: 0,
          mapWins: 0,
          mapLosses: 0,
          live: false,
        },
      ]),
  );

  const results: Result[] = [];
  const remaining: [string, string][] = [];
  const pairs = new Set<string>();
  let schedule = tallies.size >= 2;

  for (const m of inGroup) {
    const a = m.team1 && tallies.get(teamKey(m.team1.name));
    const b = m.team2 && tallies.get(teamKey(m.team2.name));

    if (!m.team1 || !m.team2 || !a || !b || a === b) {
      schedule = false;
      continue;
    }

    a.team = m.team1;
    b.team = m.team2;
    pairs.add([teamKey(m.team1.name), teamKey(m.team2.name)].toSorted().join("|"));

    const result = settled(m);

    if (!result) {
      remaining.push([teamKey(m.team1.name), teamKey(m.team2.name)]);

      if (matchState(m, now).status === "live") {
        a.live = true;
        b.live = true;
      }

      continue;
    }

    const [won, lost] = result.side === 1 ? [a, b] : [b, a];

    const [wonMaps, lostMaps] =
      result.side === 1 ? [result.wins1, result.wins2] : [result.wins2, result.wins1];

    won.seriesWins++;
    lost.seriesLosses++;
    won.mapWins += wonMaps;
    won.mapLosses += lostMaps;
    lost.mapWins += lostMaps;
    lost.mapLosses += wonMaps;
    results.push({ winner: teamKey(won.team.name), loser: teamKey(lost.team.name) });
  }

  const slots = group.teams.length;
  const roundRobin = (slots * (slots - 1)) / 2;
  const covered = group.matchGroups.every((id) => inGroup.some((m) => containerOf(m) === id));

  const sound = schedule && covered && inGroup.length === roundRobin && pairs.size === roundRobin;

  const ordered = [...tallies.values()].toSorted((a, b) => standingsKey(b) - standingsKey(a));
  const decided = sound ? certainty(ordered, remaining, group.advance) : new Map();
  const rows: StandingRow[] = [];
  const levels: Tally[][] = [];

  for (const t of ordered) {
    const current = levels.at(-1);

    if (current?.[0] && standingsKey(current[0]) === standingsKey(t)) current.push(t);
    else levels.push([t]);
  }

  for (const level of levels) {
    const first = rows.length;
    const levelKeys = new Set(level.map((t) => teamKey(t.team.name)));

    const h2h = new Map(
      level.map((t) => [
        teamKey(t.team.name),
        headToHead(teamKey(t.team.name), levelKeys, results),
      ]),
    );

    const diff = (t: Tally) => t.mapWins - t.mapLosses;

    const sorted = level.toSorted(
      (a, b) =>
        (h2h.get(teamKey(b.team.name)) ?? 0) - (h2h.get(teamKey(a.team.name)) ?? 0) ||
        diff(b) - diff(a),
    );

    let place = first + 1;

    sorted.forEach((t, i) => {
      const prev = sorted[i - 1];

      if (
        !prev ||
        h2h.get(teamKey(prev.team.name)) !== h2h.get(teamKey(t.team.name)) ||
        diff(prev) !== diff(t)
      ) {
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
        status: decided.get(teamKey(t.team.name)) ?? null,
        tiedWith: [],
        tiebreakRound: null,
      });
    });
  }

  for (const row of rows) {
    const level = rows.filter((r) => r.place === row.place);

    if (level.length < 2) continue;

    row.tiedWith = level.flatMap((r) => (r === row ? [] : [r.team.name]));

    if (level.length > 2) continue;

    const keys = new Set(level.map((r) => teamKey(r.team.name)));

    const meeting = inGroup.find(
      (m) =>
        m.team1 &&
        m.team2 &&
        keys.has(teamKey(m.team1.name)) &&
        keys.has(teamKey(m.team2.name)) &&
        !hasResult(m),
    );

    row.tiebreakRound = meeting?.round ?? null;
  }

  if (sound && remaining.length === 0) {
    for (const row of rows) {
      if (row.place + row.tiedWith.length <= group.advance) row.status = "through";
      else if (row.place > group.advance) row.status = "out";
    }
  }

  const cutoffTied =
    rows[group.advance - 1] !== undefined &&
    rows[group.advance - 1]?.place === rows[group.advance]?.place;

  return { group, supported, cutoffTied, rows };
}

export function groupOf(match: Match, groups: readonly Group[]): Group | undefined {
  return groups.find(
    (g) =>
      g.eventId === match.eventId &&
      match.phase === GROUP_STAGE &&
      g.matchGroups.includes(containerOf(match)),
  );
}

export interface GroupSplit {
  groups: { group: Group; matches: Match[] }[];
  other: Match[];
}

/** Each group with its series; series no group claims are returned apart so none disappears. */
export function splitByGroup(groups: readonly Group[], matches: readonly Match[]): GroupSplit {
  return {
    groups: groups.map((group) => ({
      group,
      matches: matches.filter((m) => groupOf(m, [group]) !== undefined),
    })),
    other: matches.filter((m) => groupOf(m, groups) === undefined),
  };
}

/** The number of rows above the cutoff line, or null when no line can be drawn without splitting a tie. */
export function cutoffAfter(table: GroupTable): number | null {
  const { advance } = table.group;

  if (!table.supported || table.cutoffTied || advance < 1 || advance >= table.rows.length) {
    return null;
  }

  return advance;
}

export function groupTables(
  groups: readonly Group[],
  matches: readonly Match[],
  now: number,
): GroupTable[] {
  return groups.map((group) => tableFor(group, matches, now));
}
