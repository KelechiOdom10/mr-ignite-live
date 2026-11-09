import { UidSchema } from "@/domain/player";
import type {
  Career,
  Freshness,
  Hero,
  HeroCareer,
  HistoryPage,
  Leaderboard,
  MatchDetail,
  PlayerCard,
  PlayerProfile,
  Uid,
} from "@/domain/player";

import type { ResponseOf } from "./endpoints";
import { catalogueHero } from "./heroes";
import { mapName } from "./maps";
import { gameModeLabel } from "./modes";
import { rankName } from "./ranks";
import { seasonLabel } from "./seasons";

/** A response uid we can link to, or null for bots and hidden players. */
export function linkableUid(uid: string): Uid | null {
  const parsed = UidSchema.safeParse(uid);

  return parsed.success ? parsed.data : null;
}

export function headIconUrl(iconId: string | null | undefined): string | null {
  if (!iconId || iconId === "0") return null;

  return `https://rivalstracker.com/images/Playerhead/img_playerhead_${iconId}.png`;
}

function numberOrNull(value: string): number | null {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

/** The current season's rank is the entry with the largest `rank_game_id`. */
function currentRank(res: ResponseOf<"career">) {
  const entries = Object.values(res.player.info.rank_game_season);

  return entries.reduce<(typeof entries)[number] | null>(
    (latest, entry) =>
      latest === null || entry.rank_game_id > latest.rank_game_id ? entry : latest,
    null,
  );
}

export function toProfile(res: ResponseOf<"career">): PlayerProfile {
  const { info } = res.player;
  const rank = currentRank(res);
  const level = rank?.level ?? null;
  const peakLevel = rank?.season_max_level ?? rank?.max_level ?? level;

  return {
    uid: res.player.uid,
    name: info.name,
    level: numberOrNull(info.level),
    club: info.club_team_mini_name || null,
    iconUrl: headIconUrl(info.cur_head_icon_id),
    // RivalsTracker has no display/signature hero; the panel falls back to recent matches.
    signatureHero: null,
    season: seasonLabel(rank?.rank_game_id ?? null),
    rank: { name: rankName(level), level, score: rank?.rank_score ?? null },
    peakRank: {
      name: rankName(peakLevel),
      level: peakLevel,
      score: rank?.max_rank_score ?? rank?.rank_score ?? null,
    },
    seasonWins: rank?.win_count ?? null,
    seasonMatches: rank?.battle_count ?? null,
    // info_update_time is when the profile row was refreshed, not when the player was last online.
    lastOnline: null,
  };
}

export function toCareer(res: ResponseOf<"career">): Career {
  const { stats } = res;
  const ranked = stats.ranked;
  const unranked = stats.unranked;
  const kills = ranked.total_kills + unranked.total_kills;
  const deaths = ranked.total_deaths + unranked.total_deaths;
  const assists = ranked.total_assists + unranked.total_assists;

  return {
    matches: stats.total_matches,
    wins: stats.total_wins,
    winRate: stats.total_matches > 0 ? stats.total_wins / stats.total_matches : null,
    playSeconds: ranked.total_time_played + unranked.total_time_played,
    kills,
    deaths,
    assists,
    kda: deaths > 0 ? (kills + assists) / deaths : null,
    kd: deaths > 0 ? kills / deaths : null,
    // The API reports none of these at career level.
    accuracy: null,
    damage: null,
    healing: null,
    mvp: null,
    svp: null,
    finalHits: null,
    headshotKills: null,
    soloKills: null,
    bestKillStreak: null,
  };
}

function resultOf(isWin: number): "win" | "loss" | "draw" {
  if (isWin === 1) return "win";

  if (isWin === 0) return "loss";

  return "draw";
}

function isoFromSeconds(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

export function toHistoryPage(res: ResponseOf<"history">, freshness: Freshness): HistoryPage {
  return {
    rows: res.match_history.map((m) => {
      const p = m.match_player;
      const score = m.dynamic_fields?.score_info;
      const us = score?.[String(p.camp)];
      const them = score?.[String(1 - p.camp)];
      const rank = p.dynamic_fields;
      const level = rank?.new_level ?? null;
      const ladder = rank?.new_score ?? null;

      return {
        matchUid: m.match_uid,
        playedAt: isoFromSeconds(m.match_time_stamp),
        season: seasonLabel(m.match_season),
        mode: gameModeLabel(m.game_mode_id),
        map: mapName(m.match_map_id),
        // No separate category label exists; the mode is the only classification.
        category: null,
        result: resultOf(p.is_win),
        score: us !== undefined && them !== undefined ? { us, them } : null,
        kills: p.k,
        deaths: p.d,
        assists: p.a,
        kda: p.d > 0 ? (p.k + p.a) / p.d : null,
        mvp: m.mvp_uid !== null && m.mvp_uid !== undefined && m.mvp_uid === p.player_uid,
        svp: m.svp_uid !== null && m.svp_uid !== undefined && m.svp_uid === p.player_uid,
        // RivalsTracker doesn't report a left-game flag or a per-match device.
        leftGame: false,
        rankChange: rank?.add_score ?? null,
        rankAfter:
          level !== null && ladder !== null
            ? { name: rankName(level), score: ladder, ladder }
            : null,
        device: null,
        durationSeconds: m.match_play_duration,
      };
    }),
    // The source returns the latest 20 matches and has no paging.
    page: 0,
    hasMore: false,
    freshness,
  };
}

export function toMatchDetail(res: ResponseOf<"match">): MatchDetail {
  const camps = [...new Set(res.match_players.map((p) => p.camp))].sort((a, b) => a - b);
  const banPicks = res.dynamic_fields?.ban_pick_info ?? [];

  return {
    matchUid: res.match_uid,
    playedAt: isoFromSeconds(res.match_time_stamp),
    mode: gameModeLabel(res.game_mode_id),
    // The match payload has no map id; only history rows carry one. No season either.
    map: null,
    category: null,
    season: null,
    durationSeconds: res.match_play_duration,
    teams: camps.map((camp) => {
      const players = res.match_players.filter((p) => p.camp === camp);

      const result = players.some((p) => p.is_win === 1)
        ? "win"
        : players.some((p) => p.is_win === 0)
          ? "loss"
          : "draw";

      return {
        id: camp,
        // No team score in the match payload.
        score: null,
        result,
        players: players.map((p) => ({
          uid: linkableUid(p.player_uid),
          name: p.nick_name.trim() || "Hidden name",
          // No AI or left-game flags in the match payload.
          isAi: false,
          leftGame: false,
          kills: p.k,
          deaths: p.d,
          assists: p.a,
          damage: p.total_hero_damage,
          healing: p.total_hero_heal,
          damageTaken: p.total_damage_taken,
          accuracy: p.session_hit_rate,
          mvp: res.mvp_uid !== null && res.mvp_uid !== undefined && res.mvp_uid === p.player_uid,
          svp: res.svp_uid !== null && res.svp_uid !== undefined && res.svp_uid === p.player_uid,
          heroes: p.player_heroes
            .map((h) => ({ ...catalogueHero(h.hero_id), playSeconds: h.play_time }))
            .sort((a, b) => b.playSeconds - a.playSeconds),
        })),
      };
    }),
    draft: banPicks.map((d) => ({
      round: d.round_idx,
      teamId: d.battle_side,
      action: d.is_pick === 1 ? "pick" : "ban",
      hero: catalogueHero(d.hero_id),
    })),
  };
}

export function toLeaderboard(
  res: ResponseOf<"leaderboard">,
  device: Leaderboard["device"],
  freshness: Freshness,
): Leaderboard {
  const season = res.players[0]?.rank.rank_game_id ?? null;

  return {
    season: seasonLabel(season),
    device,
    rows: res.players.slice(0, 100).flatMap((p, index) => {
      const uid = linkableUid(p.uid);

      if (!uid) return [];
      const matches = p.rank.battle_count ?? null;

      return [
        {
          position: index + 1,
          uid,
          name: p.name,
          iconUrl: headIconUrl(p.cur_head_icon_id),
          rank: {
            name: rankName(p.rank.level),
            level: p.rank.level,
            score: p.rank.rank_score,
          },
          matches,
          winRate: matches !== null && matches > 0 ? p.rank.win_count / matches : null,
          // rank.update_time is the record's update time, not the last match's.
          lastPlayedAt: null,
        },
      ];
    }),
    freshness,
  };
}

export type HeroCatalogue = ReadonlyMap<number, Hero>;

export function toHeroCatalogue(res: ResponseOf<"heroes">): HeroCatalogue {
  return new Map(res.heroes.map((hero) => [hero.id, hero]));
}

export function toHeroCareer(
  res: ResponseOf<"heroCareer">,
  heroId: number,
  freshness: Freshness,
): HeroCareer | null {
  const entry = res.heroes_ranked[String(heroId)] ?? res.heroes_unranked[String(heroId)];

  if (!entry) return null;

  return {
    hero: catalogueHero(heroId),
    matches: entry.matches,
    winRate: entry.matches > 0 ? entry.win / entry.matches : null,
    playSeconds: entry.play_time,
    kda: entry.deaths > 0 ? (entry.kills + entry.assists) / entry.deaths : null,
    kills: entry.kills,
    deaths: entry.deaths,
    assists: entry.assists,
    mvp: entry.mvp ?? null,
    svp: entry.svp ?? null,
    freshness,
  };
}

export interface SearchPlayer {
  uid: Uid;
  name: string;
  iconUrl: string | null;
}

export function toSearchPlayer(res: ResponseOf<"search">): SearchPlayer | null {
  const first = res[0];

  if (!first) return null;
  const uid = linkableUid(first.aid);

  if (!uid) return null;

  return { uid, name: first.name, iconUrl: headIconUrl(first.cur_head_icon_id) };
}

export function toPlayerCard(
  saved: { uid: Uid; name: string },
  res: ResponseOf<"career"> | null,
): PlayerCard {
  if (!res) {
    return {
      uid: saved.uid,
      name: saved.name,
      iconUrl: null,
      club: null,
      rank: null,
      device: null,
      form: [],
    };
  }

  const profile = toProfile(res);
  const recent = res.match_history.slice(0, 5);

  return {
    uid: saved.uid,
    name: profile.name,
    iconUrl: profile.iconUrl,
    club: profile.club,
    rank: profile.rank.name
      ? { name: profile.rank.name, level: profile.rank.level, score: profile.rank.score }
      : null,
    device: null,
    form: recent.map((m) => resultOf(m.match_player.is_win)),
  };
}
