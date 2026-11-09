import { bracketContainer, PLAYOFFS } from "./bracket";
import { matchState } from "./matchState";
import type { Match, PrizePlacement, Team } from "./model";
import { participantsOf } from "./participants";

const ROUND_KEY = /^R(\d+)M\d+$/;
const UPPER = /upper/i;
const LOWER = /lower/i;
const GRAND_FINAL = /grand\s*final/i;

interface Decided {
  match: Match;
  winner: 1 | 2;
}

export interface PrizePlacings {
  prizes: PrizePlacement[];
  derived: boolean;
}

function byName(a: Team, b: Team): number {
  return a.name.localeCompare(b.name, "en");
}

function roundColumn(match: Match): number | null {
  const key = match.id.slice(match.id.lastIndexOf("_") + 1);
  const parsed = ROUND_KEY.exec(key);

  return parsed ? Number(parsed[1]) : null;
}

function decidedPlayoffs(matches: Match[], now: number): Decided[] | null {
  const playoffs = matches.filter((match) => match.phase === PLAYOFFS);

  if (playoffs.length === 0) return null;

  if (new Set(playoffs.map(bracketContainer)).size !== 1) return null;

  const decided: Decided[] = [];

  for (const match of playoffs) {
    const state = matchState(match, now);

    if (!match.team1 || !match.team2 || state.winner === 0) return null;
    decided.push({ match, winner: state.winner });
  }

  return decided;
}

export function bracketPlacings(matches: Match[], now: number): Team[][] | null {
  const decided = decidedPlayoffs(matches, now);

  if (!decided) return null;

  const grandFinal = decided.filter(
    ({ match }) =>
      GRAND_FINAL.test(match.round) && !UPPER.test(match.round) && !LOWER.test(match.round),
  );

  const upper = decided.filter(({ match }) => UPPER.test(match.round));
  const lower = decided.filter(({ match }) => LOWER.test(match.round));

  if (grandFinal.length !== 1) return null;

  if (upper.length + lower.length + grandFinal.length !== decided.length) return null;

  const final = grandFinal[0];

  if (!final) return null;
  const winner = final.winner === 1 ? final.match.team1 : final.match.team2;
  const runnerUp = final.winner === 1 ? final.match.team2 : final.match.team1;

  if (!winner || !runnerUp) return null;

  const rounds = new Map<string, { column: number; losers: Team[] }>();

  for (const { match, winner: side } of lower) {
    const column = roundColumn(match);
    const loser = side === 1 ? match.team2 : match.team1;

    if (column === null || !loser) return null;

    const round = rounds.get(match.round);

    if (round && round.column !== column) return null;

    if (round) round.losers.push(loser);
    else rounds.set(match.round, { column, losers: [loser] });
  }

  const lowerGroups = [...rounds.values()]
    .sort((a, b) => b.column - a.column)
    .map((round) => round.losers.sort(byName));

  const playoffNames = new Set(
    decided.flatMap(({ match }) =>
      [match.team1?.name, match.team2?.name].filter((name): name is string => name !== undefined),
    ),
  );

  const unplaced = participantsOf(matches).filter((team) => !playoffNames.has(team.name));
  const groups = [[winner], [runnerUp], ...lowerGroups, ...(unplaced.length > 0 ? [unplaced] : [])];
  const placed = groups.flat();

  if (placed.length !== new Set(placed.map((team) => team.name)).size) return null;

  if (placed.length !== playoffNames.size + unplaced.length) return null;

  return groups;
}

export function fillPlacings(prizes: PrizePlacement[], groups: Team[][]): PrizePlacings {
  if (prizes.length === 0 || groups.length === 0) return { prizes, derived: false };

  const filled = [...prizes];
  let next = 0;
  let derived = false;

  for (let index = 0; index < filled.length && next < groups.length;) {
    const slot = filled[index];
    const group = groups[next];

    if (!slot || !group) break;

    if (group.length !== slot.count || index + slot.count > filled.length) break;

    const named = filled.slice(index, index + slot.count).some((prize) => prize.team !== null);

    if (!named) {
      for (let offset = 0; offset < slot.count; offset++) {
        const placement = filled[index + offset];
        const team = group[offset];

        if (!placement || !team) return { prizes, derived: false };
        filled[index + offset] = { ...placement, team };
      }

      derived = true;
    }

    index += slot.count;
    next++;
  }

  return { prizes: filled, derived };
}
