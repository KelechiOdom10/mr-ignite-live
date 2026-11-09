import { z } from "zod";

import { HeroSchema, UidSchema } from "@/domain/player";

// Hand-written from responses recorded 2026-11-09. Objects strip unknown keys because the site
// adds fields without notice; a missing or retyped field we rely on fails the parse. Ids arrive as
// numbers in some payloads and strings in others, so both become a string.

const IdSchema = z.union([z.string(), z.number().int()]).transform((id) => String(id));

const UidValueSchema = IdSchema.pipe(UidSchema);

const OptionalIdSchema = z
  .union([z.string(), z.number().int()])
  .transform((id) => String(id))
  .nullable();

const RankGameSchema = z.object({
  rank_game_id: z.number().int(),
  level: z.number().int(),
  rank_score: z.number(),
  max_level: z.number().int().optional(),
  max_rank_score: z.number().optional(),
  season_max_level: z.number().int().optional(),
  win_count: z.number().int().optional(),
  battle_count: z.number().int().optional(),
  update_time: z.number().int().optional(),
});

// rank_game_season values are JSON encoded strings, not objects. Accepting an already decoded
// object keeps the schema idempotent, so a cached parsed response can be parsed again on read.
const EncodedRankGameSchema = z.union([z.string(), RankGameSchema]).transform((raw, ctx) => {
  const decoded = RankGameSchema.safeParse(raw);

  if (decoded.success) return decoded.data;
  const encoded = z.string().safeParse(raw);

  if (!encoded.success) {
    ctx.addIssue({ code: "custom", message: "rank_game_season value is not a rank" });

    return z.NEVER;
  }

  let json: unknown;

  try {
    json = JSON.parse(encoded.data);
  } catch {
    ctx.addIssue({ code: "custom", message: "rank_game_season value is not JSON" });

    return z.NEVER;
  }

  const parsed = RankGameSchema.safeParse(json);

  if (!parsed.success) {
    ctx.addIssue({ code: "custom", message: z.prettifyError(parsed.error) });

    return z.NEVER;
  }

  return parsed.data;
});

const PlayerInfoSchema = z.looseObject({
  aid: UidValueSchema,
  name: z.string(),
  level: z.string(),
  cur_head_icon_id: z.string(),
  club_team_mini_name: z.string().optional(),
  rank_game_season: z.record(z.string(), EncodedRankGameSchema),
});

export const PlayerSchema = z
  .object({
    _id: UidValueSchema,
    info: PlayerInfoSchema,
    details: z
      .looseObject({
        region: z.string().optional(),
      })
      .optional(),
  })
  // Keeping `_id` makes the output parse again, which the cache relies on.
  .transform((player) => ({ ...player, uid: player["_id"] }));

const SideStatsSchema = z.object({
  total_kills: z.number(),
  total_assists: z.number(),
  total_deaths: z.number(),
  total_time_played: z.number(),
});

export const StatsSchema = z.object({
  total_matches: z.number().int(),
  total_wins: z.number().int(),
  ranked_matches: z.number().int(),
  ranked_matches_wins: z.number().int(),
  unranked_matches: z.number().int(),
  unranked_matches_wins: z.number().int(),
  ranked: SideStatsSchema,
  unranked: SideStatsSchema,
});

export const VisibilitySchema = z.object({
  platform: z.string().optional(),
  overview: z.boolean(),
  career_stats: z.boolean(),
  match_history: z.boolean(),
  timeline: z.boolean().optional(),
});

const HeroStatsSchema = z.object({
  matches: z.number(),
  win: z.number(),
  kills: z.number(),
  deaths: z.number(),
  assists: z.number(),
  damage: z.number().optional(),
  heal: z.number().optional(),
  mvp: z.number().optional(),
  svp: z.number().optional(),
  play_time: z.number(),
});

const RankDynamicSchema = z.object({
  add_score: z.number().optional(),
  level: z.number().int().optional(),
  new_level: z.number().int().optional(),
  new_score: z.number().optional(),
});

const HistoryMatchSchema = z.object({
  match_map_id: z.number().int(),
  match_play_duration: z.number(),
  match_season: z.string(),
  match_uid: z.string(),
  match_winner_side: z.number().int().optional(),
  mvp_uid: OptionalIdSchema.optional(),
  svp_uid: OptionalIdSchema.optional(),
  match_time_stamp: z.number().int(),
  game_mode_id: z.number().int(),
  dynamic_fields: z
    .looseObject({
      score_info: z.record(z.string(), z.number()).optional(),
    })
    .nullable()
    .optional(),
  match_player: z.object({
    player_uid: IdSchema,
    camp: z.number().int(),
    is_win: z.number().int(),
    has_escaped: z.boolean().optional(),
    k: z.number(),
    d: z.number(),
    a: z.number(),
    dynamic_fields: RankDynamicSchema.nullable().optional(),
    player_hero: z.object({ hero_id: z.number().int() }).nullable().optional(),
  }),
});

export const PlayerResponseSchema = z.object({
  stats: StatsSchema,
  player: PlayerSchema,
  visibility: VisibilitySchema,
  career_settings: z.record(z.string(), z.number()).optional(),
  match_history: z.array(HistoryMatchSchema),
  heroes_ranked: z.record(z.string(), HeroStatsSchema),
  heroes_unranked: z.record(z.string(), HeroStatsSchema),
});

const MatchPlayerSchema = z.object({
  player_uid: IdSchema,
  nick_name: z.string(),
  player_icon: z.number().int().optional(),
  camp: z.number().int(),
  cur_hero_id: z.number().int(),
  is_win: z.number().int(),
  k: z.number(),
  d: z.number(),
  a: z.number(),
  total_hero_damage: z.number(),
  total_hero_heal: z.number(),
  total_damage_taken: z.number(),
  session_hit_rate: z.number().nullable(),
  solo_kill: z.number().optional(),
  dynamic_fields: RankDynamicSchema.nullable().optional(),
  player_heroes: z.array(
    z.object({
      hero_id: z.number().int(),
      k: z.number(),
      d: z.number(),
      a: z.number(),
      play_time: z.number(),
    }),
  ),
});

const BanPickSchema = z.object({
  is_pick: z.number().int(),
  battle_side: z.number().int(),
  round_idx: z.number().int(),
  hero_id: z.number().int(),
});

export const MatchResponseSchema = z.object({
  match_uid: z.string(),
  game_mode_id: z.number().int(),
  match_play_duration: z.number(),
  match_time_stamp: z.number().int(),
  mvp_uid: OptionalIdSchema.optional(),
  svp_uid: OptionalIdSchema.optional(),
  mvp_hero_id: z.number().int().nullable().optional(),
  svp_hero_id: z.number().int().nullable().optional(),
  match_players: z.array(MatchPlayerSchema),
  dynamic_fields: z
    .looseObject({
      ban_pick_info: z.array(BanPickSchema).optional(),
    })
    .nullable()
    .optional(),
});

const LeaderboardRankSchema = z.object({
  rank_game_id: z.number().int(),
  level: z.number().int(),
  rank_score: z.number(),
  max_level: z.number().int().optional(),
  max_rank_score: z.number().optional(),
  win_count: z.number().int(),
  battle_count: z.number().int().optional(),
  update_time: z.number().int().optional(),
});

export const LeaderboardResponseSchema = z.object({
  season: z.union([z.number().int(), z.string()]),
  device: z.union([z.number().int(), z.string()]),
  players: z.array(
    z.object({
      score: z.number().optional(),
      uid: IdSchema,
      name: z.string(),
      cur_head_icon_id: z.string(),
      rank: LeaderboardRankSchema,
    }),
  ),
});

export const FindPlayerResponseSchema = z.array(
  z.object({
    aid: IdSchema,
    name: z.string(),
    cur_head_icon_id: z.string(),
  }),
);

export const HeroesResponseSchema = z.object({ heroes: z.array(HeroSchema) });
