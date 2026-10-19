import { heroDisplayName } from "@/domain/heroes";
import {
  HeroRoleSchema,
  UidSchema,
  type Career,
  type Freshness,
  type Hero,
  type HeroCareer,
  type HistoryPage,
  type Leaderboard,
  type MatchDetail,
  type PlayerCard,
  type PlayerProfile,
  type Uid,
} from "@/domain/player";

import type { ResponseOf } from "./endpoints";

/** A response uid we can link to, or null for bots and hidden players. */
export function linkableUid(uid: string): Uid | null {
  const parsed = UidSchema.safeParse(uid);

  return parsed.success ? parsed.data : null;
}

export function toLeaderboard(res: ResponseOf<"leaderboard">, freshness: Freshness): Leaderboard {
  return {
    season: res.season.number,
    device: res.device_type,
    rows: res.entries.flatMap((e) => {
      const uid = linkableUid(e.player.uid);

      if (!uid) return [];

      return [
        {
          position: e.position,
          uid,
          name: e.player.name ?? "Hidden name",
          iconUrl: e.player.head_icon,
          rank: { name: e.rank.rank, level: e.rank.rank_level, score: e.rank.rs },
          matches: e.matches,
          winRate: e.win_rate,
          lastPlayedAt: e.last_played_at,
        },
      ];
    }),
    freshness,
  };
}

export type HeroCatalogue = ReadonlyMap<number, Hero>;

export function toHeroCatalogue(res: ResponseOf<"heroes">): HeroCatalogue {
  return new Map(
    res.heroes.map((h) => [
      h.id,
      {
        id: h.id,
        name: heroDisplayName(h.name),
        role: HeroRoleSchema.safeParse(h.role).data ?? null,
        iconUrl: h.icon,
      },
    ]),
  );
}

/** A hero from a response, filled in from the catalogue when it's missing a name, role or icon. */
export function toHero(
  ref: { id: number; name: string | null; icon?: string | null },
  catalogue: HeroCatalogue,
): Hero {
  const known = catalogue.get(ref.id);

  return {
    id: ref.id,
    name: ref.name ? heroDisplayName(ref.name) : (known?.name ?? `Hero ${ref.id}`),
    role: known?.role ?? null,
    iconUrl: ref.icon ?? known?.iconUrl ?? null,
  };
}

function isoFromSeconds(seconds: number | null): string | null {
  return seconds === null ? null : new Date(seconds * 1000).toISOString();
}

export function toProfile(res: ResponseOf<"career">, catalogue: HeroCatalogue): PlayerProfile {
  const { player } = res;
  const rank = player.rank;

  return {
    uid: player.uid,
    name: player.name,
    level: player.account_level,
    club: player.club?.tag ?? null,
    iconUrl: player.head_icon?.image ?? null,
    signatureHero: player.display_hero ? toHero(player.display_hero, catalogue) : null,
    season: rank?.season ?? null,
    rank: { name: rank?.rank ?? null, level: rank?.rank_level ?? null, score: rank?.rs ?? null },
    peakRank: {
      name: rank?.peak_rank ?? null,
      level: rank?.peak_rank_level ?? null,
      score: rank?.peak_rs ?? null,
    },
    seasonWins: rank?.wins ?? null,
    seasonMatches: rank?.matches ?? null,
    lastOnline: isoFromSeconds(player.last_online),
  };
}

export function toCareer(res: ResponseOf<"career">): Career {
  const c = res.career;

  return {
    matches: c.matches,
    wins: c.wins,
    winRate: c.win_rate,
    playSeconds: c.play_time.seconds,
    kills: c.kills,
    deaths: c.deaths,
    assists: c.assists,
    kda: c.kda,
    accuracy: c.accuracy,
    damage: c.damage,
    healing: c.healing,
    mvp: c.mvp,
    svp: c.svp,
    kd: c.kd,
    finalHits: c.final_hits,
    headshotKills: c.headshot_kills,
    soloKills: c.solo_kills,
    bestKillStreak: c.best_kill_streak,
  };
}

export function toHistoryPage(res: ResponseOf<"history">, freshness: Freshness): HistoryPage {
  return {
    rows: res.matches.map((m) => ({
      matchUid: m.match_uid,
      playedAt: m.played_at,
      season: m.season.number,
      mode: m.game_mode,
      map: m.map.name,
      category: m.category?.name ?? null,
      result: m.result,
      score: m.score ? { us: m.score.player, them: m.score.opponent } : null,
      kills: m.player.kills,
      deaths: m.player.deaths,
      assists: m.player.assists,
      kda: m.player.kda,
      mvp: m.player.mvp,
      svp: m.player.svp,
      leftGame: m.player.left_game,
      rankChange: m.player.rank?.change ?? null,
      rankAfter: m.player.rank
        ? {
            name: m.player.rank.after.rank,
            score: m.player.rank.after.rs,
            ladder: m.player.rank.after.rank_score,
          }
        : null,
      device: m.player.device_type ?? null,
      durationSeconds: m.duration.seconds,
    })),
    page: res.pagination.page,
    hasMore: res.pagination.has_more,
    freshness,
  };
}

export function toMatchDetail(res: ResponseOf<"match">, catalogue: HeroCatalogue): MatchDetail {
  return {
    matchUid: res.match_uid,
    playedAt: res.played_at,
    mode: res.game_mode,
    map: res.map.name,
    category: res.category?.name ?? null,
    season: res.season.number,
    durationSeconds: res.duration.seconds,
    teams: res.teams.map((t) => ({
      id: t.id,
      score: t.score,
      result: t.result,
      players: res.players
        .filter((p) => p.team_id === t.id)
        .map((p) => ({
          uid: linkableUid(p.uid),
          name: p.name ?? (p.is_ai ? "Bot" : "Hidden name"),
          isAi: p.is_ai,
          leftGame: p.left_game,
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          damage: p.damage,
          healing: p.healing,
          damageTaken: p.damage_taken,
          accuracy: p.accuracy,
          mvp: p.mvp,
          svp: p.svp,
          heroes: p.heroes
            .map((h) => ({ ...toHero(h, catalogue), playSeconds: h.play_time.seconds }))
            .sort((a, b) => b.playSeconds - a.playSeconds),
        })),
    })),
    draft: (res.draft ?? []).map((d) => ({
      round: d.round,
      teamId: d.team_id,
      action: d.action,
      hero: d.hero ? toHero(d.hero, catalogue) : null,
    })),
  };
}

export function toHeroCareer(
  res: ResponseOf<"heroCareer">,
  catalogue: HeroCatalogue,
  freshness: Freshness,
): HeroCareer {
  const c = res.career;

  return {
    hero: toHero(res.hero, catalogue),
    matches: c.matches,
    winRate: c.win_rate,
    playSeconds: c.play_time.seconds,
    kda: c.kda,
    kills: c.kills,
    deaths: c.deaths,
    assists: c.assists,
    mvp: c.mvp,
    svp: c.svp,
    freshness,
  };
}

/** A list card from whatever is cached: the career gives identity and rank, history the form. */
export function toPlayerCard(
  saved: { uid: Uid; name: string },
  career: ResponseOf<"career"> | null,
  history: ResponseOf<"history"> | null,
): PlayerCard {
  const player = career?.player;
  const rank = player?.rank;
  const recent = history?.matches.slice(0, 5) ?? [];

  return {
    uid: saved.uid,
    name: player?.name ?? saved.name,
    iconUrl: player?.head_icon?.image ?? null,
    club: player?.club?.tag ?? null,
    rank: rank ? { name: rank.rank, level: rank.rank_level, score: rank.rs } : null,
    device: recent[0]?.player.device_type ?? null,
    form: recent.map((m) => m.result),
  };
}
