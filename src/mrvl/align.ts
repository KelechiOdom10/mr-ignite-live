import type { MapOverride, MapWinner, Match, Team } from "@/domain/model";
import type { Hero, MapStats, MatchStats, PlayerStats, TeamMapStats } from "@/domain/stats";

import type { MrvlGame, MrvlMatchPage, MrvlMatchSummary, MrvlScoreboardTeam } from "./client";

const STOPWORDS = new Set(["gaming", "esports", "esport", "team", "club", "gg"]);
const MAX_SCHEDULE_DRIFT_MS = 3 * 60 * 60 * 1000;

function variants(name: string): string[] {
  const spaced = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const core = spaced
    .split(" ")
    .filter((w) => w && !STOPWORDS.has(w))
    .join(" ");
  return [spaced, spaced.replace(/ /g, ""), core, core.replace(/ /g, "")].filter(Boolean);
}

function nameSet(names: (string | null | undefined)[]): Set<string> {
  return new Set(names.flatMap((n) => (n ? variants(n) : [])));
}

function similarity(a: Set<string>, b: Set<string>): number {
  let best = 0;
  for (const x of a) {
    for (const y of b) {
      if (x === y) return 100;
      if ((x.includes(y) && y.length >= 4) || (y.includes(x) && x.length >= 4)) best = 78;
    }
  }
  return best;
}

function lpNames(team: Team | null): Set<string> {
  return nameSet([team?.name, team?.short]);
}

function summaryNames(summary: MrvlMatchSummary, side: "one" | "two"): Set<string> {
  return side === "one"
    ? nameSet([
        summary.teamOneName,
        summary.teamOneSnapshot?.name,
        summary.teamOneSnapshot?.tag,
        ...(summary.teamOneSearchNames ?? []),
      ])
    : nameSet([
        summary.teamTwoName,
        summary.teamTwoSnapshot?.name,
        summary.teamTwoSnapshot?.tag,
        ...(summary.teamTwoSearchNames ?? []),
      ]);
}

export function findMrvlMatch(
  match: Match,
  summaries: MrvlMatchSummary[],
): MrvlMatchSummary | null {
  if (!match.team1 || !match.team2 || !match.startsAt) return null;
  const start = Date.parse(match.startsAt);
  const t1 = lpNames(match.team1);
  const t2 = lpNames(match.team2);
  let best: { summary: MrvlMatchSummary; score: number } | null = null;
  for (const summary of summaries) {
    const at = summary.scheduledAt ? Date.parse(summary.scheduledAt) : Number.NaN;
    if (Number.isNaN(at) || Math.abs(at - start) > MAX_SCHEDULE_DRIFT_MS) continue;
    const one = summaryNames(summary, "one");
    const two = summaryNames(summary, "two");
    const straight = Math.min(similarity(t1, one), similarity(t2, two));
    const crossed = Math.min(similarity(t1, two), similarity(t2, one));
    const score = Math.max(straight, crossed);
    if (score > 0 && (!best || score > best.score)) {
      best = { summary, score };
    }
  }
  return best?.summary ?? null;
}

function sideOf(team: MrvlScoreboardTeam, match: Match): 1 | 2 | null {
  const names = nameSet([team.linkedTeamName, team.name, team.shortName]);
  const s1 = similarity(names, lpNames(match.team1));
  const s2 = similarity(names, lpNames(match.team2));
  if (s1 === s2) return null;
  return s1 > s2 ? 1 : 2;
}

function alignTeams(game: MrvlGame, match: Match): [MrvlScoreboardTeam, MrvlScoreboardTeam] | null {
  const teams = game.scoreboard?.teams ?? [];
  const [a, b] = teams;
  if (!a || !b) return null;
  const sideA = sideOf(a, match);
  const sideB = sideOf(b, match);
  if (sideA === 2 || sideB === 1) return [b, a];
  return [a, b];
}

function toHero(hero: { id: string; name: string; role?: string | null }): Hero {
  return { id: hero.id, name: hero.name, role: hero.role ?? null };
}

function toPlayer(p: MrvlScoreboardTeam["players"][number]): PlayerStats {
  const s = p.stats ?? {};
  return {
    name: p.linkedPlayerName ?? p.name,
    nationality: p.linkedNationality ?? null,
    hero: p.hero ? toHero(p.hero) : null,
    heroes: (p.heroesPlayed ?? []).map((h) => ({
      ...toHero(h.hero),
      playSeconds: h.playTimeSeconds ?? 0,
    })),
    kills: s.kills ?? 0,
    deaths: s.deaths ?? 0,
    assists: s.assists ?? 0,
    finalHits: s.finalHits ?? 0,
    damage: s.damage ?? 0,
    damageTaken: s.damageTaken ?? 0,
    healing: s.healing ?? 0,
    accuracy: s.accuracy ?? null,
    isMvp: p.isMvp ?? false,
    isSvp: p.isSvp ?? false,
  };
}

function toTeam(team: MrvlScoreboardTeam): TeamMapStats {
  return {
    name: team.linkedTeamName ?? team.name,
    won: team.isWinner ?? false,
    score: team.score ?? null,
    bans: (team.bans ?? []).filter((b) => b.kind === "ban").map((b) => toHero(b.hero)),
    players: team.players.map(toPlayer),
  };
}

export function toMatchStats(
  match: Match,
  page: MrvlMatchPage,
  sourceUpdatedAt: string,
  fetchedAt: Date,
): MatchStats {
  const maps: MapStats[] = [];
  for (const game of page.match.games) {
    const aligned = alignTeams(game, match);
    if (!aligned || !game.scoreboard) continue;
    maps.push({
      index: game.gameNumber,
      map: game.scoreboard.map?.name ?? game.map ?? `Map ${game.gameNumber}`,
      durationSeconds: game.scoreboard.durationSeconds ?? null,
      teams: [toTeam(aligned[0]), toTeam(aligned[1])],
    });
  }
  return {
    matchId: match.id,
    source: "mrvl",
    sourceMatchId: page.match.id,
    sourceUpdatedAt,
    fetchedAt: fetchedAt.toISOString(),
    maps,
  };
}

export function toMapOverrides(stats: MatchStats): MapOverride[] {
  return stats.maps.flatMap((m) => {
    const [t1, t2] = m.teams;
    const winner: MapWinner = t1.won ? 1 : t2.won ? 2 : 0;
    if (winner === 0) return [];
    return [{ index: m.index, map: m.map, score1: t1.score, score2: t2.score, winner }];
  });
}
