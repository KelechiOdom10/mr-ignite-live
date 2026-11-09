import { type GameMode, mapInfo } from "./maps";
import type { DraftAction, Hero, MapStats, MatchStats } from "./stats";

/** Lobby camp 0 acts as "first", camp 1 as "second"; "both" steps are taken by each team at once. */
export type DraftActor = "first" | "second" | "both";

export interface DraftStep {
  actor: DraftActor;
  kind: DraftAction["kind"];
}

export interface DraftFormat {
  id: string;
  name: string;
  banBlocks: "opponent" | "both teams";
  sharedBans: boolean;
  steps: readonly DraftStep[];
  /** False when the rules come from too few drafts to state as fact. */
  confirmed: boolean;
  basis: string;
}

const both = (kind: DraftAction["kind"]): DraftStep => ({ actor: "both", kind });
const first = (kind: DraftAction["kind"]): DraftStep => ({ actor: "first", kind });
const second = (kind: DraftAction["kind"]): DraftStep => ({ actor: "second", kind });

export const IGNITE_2026: DraftFormat = {
  id: "ignite-2026",
  name: "Ignite 2026 tournament draft",
  banBlocks: "opponent",
  sharedBans: true,
  steps: [
    both("ban"),
    first("protect"),
    second("ban"),
    second("protect"),
    first("ban"),
    both("ban"),
    second("protect"),
    first("ban"),
    first("protect"),
    second("ban"),
    both("ban"),
  ],
  confirmed: true,
  basis:
    "Read from mrvl.net's draft timelines for Ignite 2026 Stage 2 maps in the Americas, EMEA and China, and matched step for step against the broadcast draft screen for FlyQuest vs 100 Thieves on God Quarry.",
};

/** Seen in one recorded Season 10.5 Competitive match; shown for comparison, never simulated. */
export const RANKED_SEASON_10_OBSERVED: DraftFormat = {
  id: "ranked-s10-observed",
  name: "Ranked Competitive bans (one recorded match)",
  banBlocks: "both teams",
  sharedBans: false,
  steps: [first("ban"), second("ban"), second("ban"), first("ban"), first("ban"), second("ban")],
  confirmed: false,
  basis:
    "One recorded Season 10.5 Grandmaster+ match: six different heroes, banned in this order, none played. Not confirmed by official notes.",
};

function actsIn(step: DraftStep, camp: number): boolean {
  return step.actor === "both" || (step.actor === "first" ? camp === 0 : camp === 1);
}

/** Every way a map's recorded draft departs from the format; empty when it follows it exactly. */
export function formatDeviations(draft: readonly DraftAction[], format: DraftFormat): string[] {
  const deviations: string[] = [];

  for (const [phase, step] of format.steps.entries()) {
    for (const camp of [0, 1]) {
      const taken = draft.filter((a) => a.phase === phase && a.camp === camp);
      const expected = actsIn(step, camp) ? 1 : 0;

      if (taken.length !== expected || taken.some((a) => a.kind !== step.kind)) {
        deviations.push(
          `step ${phase}: camp ${camp} made ${taken.map((a) => a.kind).join(", ") || "no move"}, expected ${expected ? step.kind : "no move"}`,
        );
      }
    }
  }

  for (const a of draft) {
    if (a.phase >= format.steps.length) deviations.push(`step ${a.phase} is past the format's end`);
  }

  return deviations;
}

function teamOn(map: MapStats, side: 1 | 2): MapStats["teams"][number] {
  return side === 1 ? map.teams[0] : map.teams[1];
}

function playedBy(map: MapStats, side: 1 | 2): Set<string> {
  const team = teamOn(map, side);

  return new Set(
    team.players.flatMap((p) => p.heroes.filter((h) => h.playSeconds > 0).map((h) => h.id)),
  );
}

/** Heroes a team banned that the other team still played; empty when bans only bind the opponent. */
export function bansBroken(map: MapStats): string[] {
  return ([1, 2] as const).flatMap((side) => {
    const other = playedBy(map, side === 1 ? 2 : 1);

    return teamOn(map, side)
      .bans.filter((h) => other.has(h.id))
      .map((h) => h.id);
  });
}

/** One team's side of the draft on one map: the unit every pick, ban and protect count here uses. */
export interface TeamDraft {
  matchId: string;
  mapIndex: number;
  map: string;
  mode: GameMode | null;
  team: string;
  bans: Hero[];
  /** Null when the stored map has no draft order, so protects aren't known. */
  protects: Hero[] | null;
  played: Hero[];
}

function uniqueHeroes(heroes: readonly Hero[]): Hero[] {
  return [...new Map(heroes.map((h) => [h.id, h])).values()];
}

export function toTeamDrafts(stats: readonly MatchStats[]): TeamDraft[] {
  return stats.flatMap((s) =>
    s.maps.flatMap((map) =>
      ([1, 2] as const).map((side) => {
        const team = teamOn(map, side);

        return {
          matchId: s.matchId,
          mapIndex: map.index,
          map: map.map,
          mode: mapInfo(map.map)?.mode ?? null,
          team: team.name,
          bans: uniqueHeroes(team.bans),
          protects:
            map.draft &&
            uniqueHeroes(
              map.draft.filter((a) => a.side === side && a.kind === "protect").map((a) => a.hero),
            ),
          played: uniqueHeroes(
            team.players.flatMap((p) =>
              p.heroes.filter((h) => h.playSeconds > 0).map(({ playSeconds: _, ...hero }) => hero),
            ),
          ),
        };
      }),
    ),
  );
}

export interface HeroDraftRow {
  hero: Hero;
  played: number;
  banned: number;
  /** Team drafts that protected the hero, out of those with protects known. */
  protected: number;
  presentMaps: number;
}

export interface DraftSample {
  teamDrafts: number;
  maps: number;
  series: number;
  /** Team drafts whose protects are known; the denominator for protect rates. */
  withProtects: number;
}

export interface DraftSummary {
  rows: HeroDraftRow[];
  sample: DraftSample;
}

export interface DraftFilter {
  map?: string | null;
  mode?: GameMode | null;
}

export function filterDrafts(drafts: readonly TeamDraft[], filter: DraftFilter): TeamDraft[] {
  return drafts.filter(
    (d) => (!filter.map || d.map === filter.map) && (!filter.mode || d.mode === filter.mode),
  );
}

export function summariseDrafts(drafts: readonly TeamDraft[]): DraftSummary {
  const rows = new Map<string, HeroDraftRow>();

  const row = (hero: Hero): HeroDraftRow => {
    let r = rows.get(hero.id);

    if (!r) {
      r = { hero, played: 0, banned: 0, protected: 0, presentMaps: 0 };
      rows.set(hero.id, r);
    }

    return r;
  };

  const presence = new Map<string, Set<string>>();

  for (const d of drafts) {
    const mapKey = `${d.matchId}#${d.mapIndex}`;

    const touch = (hero: Hero) => {
      row(hero);
      const maps = presence.get(hero.id) ?? new Set<string>();
      maps.add(mapKey);
      presence.set(hero.id, maps);
    };

    for (const h of d.played) {
      row(h).played++;
      touch(h);
    }

    for (const h of d.bans) {
      row(h).banned++;
      touch(h);
    }

    for (const h of d.protects ?? []) {
      row(h).protected++;
      touch(h);
    }
  }

  for (const [id, maps] of presence) {
    const r = rows.get(id);

    if (r) r.presentMaps = maps.size;
  }

  return {
    rows: [...rows.values()].sort(
      (a, b) =>
        b.presentMaps - a.presentMaps ||
        b.banned - a.banned ||
        b.played - a.played ||
        a.hero.name.localeCompare(b.hero.name),
    ),
    sample: {
      teamDrafts: drafts.length,
      maps: new Set(drafts.map((d) => `${d.matchId}#${d.mapIndex}`)).size,
      series: new Set(drafts.map((d) => d.matchId)).size,
      withProtects: drafts.filter((d) => d.protects !== null).length,
    },
  };
}

export interface DraftCoverage {
  series: number;
  maps: number;
  mapsWithOrder: number;
  /** Of the maps with draft order, how many follow the format exactly. */
  mapsFollowingFormat: number;
  bans: number;
  bansBroken: number;
  oldestFetchedAt: string | null;
  newestFetchedAt: string | null;
}

/**
 * Only the maps whose recorded draft follows the format step for step, so shares shown beside a
 * practice board aren't diluted by maps drafted another way or with no recorded order.
 */
export function statsFollowingFormat(
  stats: readonly MatchStats[],
  format: DraftFormat,
): MatchStats[] {
  return stats.flatMap((s) => {
    const maps = s.maps.filter((m) => m.draft && formatDeviations(m.draft, format).length === 0);

    return maps.length > 0 ? [{ ...s, maps }] : [];
  });
}

export function draftCoverage(stats: readonly MatchStats[], format: DraftFormat): DraftCoverage {
  const maps = stats.flatMap((s) => s.maps);
  const ordered = maps.flatMap((m) => (m.draft ? [m.draft] : []));
  const fetched = stats.map((s) => s.fetchedAt).sort();

  return {
    series: stats.length,
    maps: maps.length,
    mapsWithOrder: ordered.length,
    mapsFollowingFormat: ordered.filter((d) => formatDeviations(d, format).length === 0).length,
    bans: maps.reduce((n, m) => n + m.teams[0].bans.length + m.teams[1].bans.length, 0),
    bansBroken: maps.reduce((n, m) => n + bansBroken(m).length, 0),
    oldestFetchedAt: fetched[0] ?? null,
    newestFetchedAt: fetched.at(-1) ?? null,
  };
}
