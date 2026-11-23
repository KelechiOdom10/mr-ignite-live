import type { Match } from "./model";

export interface TeamIdentity {
  /** The canonical display name. */
  name: string;
  /** Every raw spelling that maps to this team, the canonical one first. */
  spellings: string[];
}

/** Case, punctuation and spacing carry no meaning in a team name, so identity drops them. */
export function teamKey(name: string): string {
  return name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

function titleCase(name: string): string {
  return name.replace(
    /[\p{L}\p{N}]+/gu,
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
}

function caseDeviation(name: string): number {
  const expected = titleCase(name);
  let deviations = 0;

  for (let index = 0; index < name.length; index++) {
    if (name[index] !== expected[index]) deviations++;
  }

  return deviations;
}

function spellingCounts(matches: readonly Match[]): Map<string, Map<string, number>> {
  const groups = new Map<string, Map<string, number>>();

  for (const match of matches) {
    for (const team of [match.team1, match.team2]) {
      if (!team) continue;

      const key = teamKey(team.name);
      const counts = groups.get(key) ?? new Map<string, number>();

      counts.set(team.name, (counts.get(team.name) ?? 0) + 1);
      groups.set(key, counts);
    }
  }

  return groups;
}

/**
 * The canonical name is the spelling used by the most series; a tie goes to the one closest to
 * Liquipedia title case, then to the first alphabetically, so the choice never depends on order.
 */
function canonicalName(counts: ReadonlyMap<string, number>): string {
  const [name = ""] = [...counts.keys()].toSorted(
    (a, b) =>
      (counts.get(b) ?? 0) - (counts.get(a) ?? 0) ||
      caseDeviation(a) - caseDeviation(b) ||
      a.localeCompare(b),
  );

  return name;
}

/**
 * One entry per team, whatever spellings it was recorded under, sorted by canonical name. Teams
 * that merely look similar stay apart: a wrong merge would hide a real fixture.
 */
export function teamIdentities(matches: readonly Match[]): TeamIdentity[] {
  const identities = [...spellingCounts(matches)].map(([, counts]) => {
    const name = canonicalName(counts);

    const used = [...counts.keys()].toSorted(
      (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b),
    );

    return { name, spellings: [name, ...used.filter((spelling) => spelling !== name)] };
  });

  return identities.toSorted((a, b) => a.name.localeCompare(b.name));
}

/** Every spelling of the team `name` folds into, so a filter finds its series under any of them. */
export function teamSpellings(matches: readonly Match[], name: string): ReadonlySet<string> {
  const key = teamKey(name);
  const spellings = new Set<string>([name]);

  for (const match of matches) {
    for (const team of [match.team1, match.team2]) {
      if (team && teamKey(team.name) === key) spellings.add(team.name);
    }
  }

  return spellings;
}
