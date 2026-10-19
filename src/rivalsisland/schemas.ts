import { z } from "zod";

import { UidSchema } from "@/domain/player";

// Hand-written from RivalsIsland's OpenAPI 2.1.0. Objects strip unknown keys because the API adds
// fields without notice; a missing or retyped field fails the parse.

// The spec only constrains uids in request paths. Bots and hidden players may not have a linkable
// one, so response uids stay plain strings and become a Uid only where we link to a player.
const VendorUidSchema = z.string();

const PlayTimeSchema = z.object({ seconds: z.number(), formatted: z.string() });
const AssetRefSchema = z.object({ id: z.string(), image: z.string().nullable() });
const DisplayHeroSchema = z.object({ id: z.number().int(), name: z.string().nullable() });

const HeroRefSchema = z.object({
  id: z.number().int(),
  name: z.string().nullable(),
  icon: z.string().nullable(),
});

const CatalogRefSchema = z.object({ id: z.number().int(), name: z.string().nullable() });

const SeasonRefSchema = z.object({
  id: z.number().int(),
  number: z.string().nullable(),
  name: z.string().nullable(),
});

const ResultSchema = z.enum(["win", "loss", "draw", "abandoned"]);

export const PlayerRankSchema = z.object({
  season_id: z.number().int().nullable(),
  season: z.string().nullable(),
  rank: z.string().nullable(),
  rank_level: z.number().int().nullable(),
  rank_score: z.number().nullable(),
  rs: z.number().nullable(),
  peak_rank: z.string().nullable(),
  peak_rank_level: z.number().int().nullable(),
  peak_rank_score: z.number().nullable(),
  peak_rs: z.number().nullable(),
  wins: z.number().int().nullable(),
  matches: z.number().int().nullable(),
  updated_at: z.number().int().nullable(),
});

export const SearchResponseSchema = z.object({
  query: z.string(),
  player: z
    .object({
      uid: VendorUidSchema,
      name: z.string(),
      account_level: z.number().int().nullable(),
      head_icon: AssetRefSchema.nullable(),
      display_hero: DisplayHeroSchema.nullable(),
      rank: PlayerRankSchema.nullable(),
    })
    .nullable(),
});

const LeanPlayerSchema = z.object({
  uid: UidSchema,
  name: z.string(),
  account_level: z.number().int().nullable(),
  created_at: z.number().int().nullable(),
  last_online: z.number().int().nullable(),
  head_icon: AssetRefSchema.nullable(),
  display_hero: DisplayHeroSchema.nullable(),
  club: z.object({ id: z.string(), tag: z.string().nullable() }).nullable(),
  rank: PlayerRankSchema.nullable(),
});

export const CareerResponseSchema = z.object({
  player: LeanPlayerSchema,
  career: z.object({
    matches: z.number().int(),
    wins: z.number().int(),
    win_rate: z.number().nullable(),
    play_time: PlayTimeSchema,
    kills: z.number().int(),
    deaths: z.number().int(),
    assists: z.number().int(),
    kd: z.number().nullable(),
    kda: z.number().nullable(),
    accuracy: z.number().nullable(),
    damage: z.number(),
    healing: z.number(),
    damage_taken: z.number(),
    final_hits: z.number().int(),
    headshot_kills: z.number().int(),
    solo_kills: z.number().int(),
    best_kill_streak: z.number().int(),
    mvp: z.number().int(),
    svp: z.number().int(),
  }),
});

export const HeroCareerResponseSchema = z.object({
  player: LeanPlayerSchema,
  hero: HeroRefSchema,
  career: z.object({
    // Fractional in practice (7.5014), though the spec allows integers.
    matches: z.number(),
    wins: z.number(),
    win_rate: z.number().nullable(),
    play_time: PlayTimeSchema,
    kills: z.number().int(),
    deaths: z.number().int(),
    assists: z.number().int(),
    kd: z.number().nullable(),
    kda: z.number().nullable(),
    accuracy: z.number().nullable(),
    damage: z.number(),
    healing: z.number(),
    mvp: z.number().int(),
    svp: z.number().int(),
  }),
});

const RankPointSchema = z.object({
  rank: z.string().nullable(),
  rank_level: z.number().int(),
  rank_score: z.number(),
  rs: z.number().nullable(),
});

const RankTransitionSchema = z.object({
  before: RankPointSchema,
  change: z.number(),
  after: RankPointSchema,
});

export const MatchHistoryResponseSchema = z.object({
  uid: UidSchema,
  matches: z.array(
    z.object({
      match_uid: z.string(),
      season: SeasonRefSchema,
      category: CatalogRefSchema.nullable(),
      game_mode: z.string().nullable(),
      map: CatalogRefSchema,
      played_at: z.iso.datetime(),
      duration: PlayTimeSchema,
      result: ResultSchema,
      score: z.object({ player: z.number(), opponent: z.number() }).nullable(),
      player: z.object({
        kills: z.number(),
        deaths: z.number(),
        assists: z.number(),
        kda: z.number().nullable(),
        left_game: z.boolean(),
        mvp: z.boolean(),
        svp: z.boolean(),
        rank: RankTransitionSchema.nullable(),
        device_type: z.enum(["pc", "ps", "xbox"]).nullish(),
      }),
    }),
  ),
  pagination: z.object({
    page: z.number().int(),
    page_size: z.number().int(),
    has_more: z.boolean(),
  }),
});

const HeroSegmentSchema = HeroRefSchema.extend({
  play_time: PlayTimeSchema,
  kills: z.number(),
  deaths: z.number(),
  assists: z.number(),
  damage: z.number(),
  healing: z.number(),
});

export const MatchDetailSchema = z.object({
  match_uid: z.string(),
  season: SeasonRefSchema,
  category: CatalogRefSchema.nullable(),
  game_mode: z.string().nullable(),
  map: CatalogRefSchema,
  played_at: z.iso.datetime(),
  duration: PlayTimeSchema,
  winner_team_id: z.number().int().nullable(),
  draw: z.boolean(),
  teams: z.array(
    z.object({ id: z.number().int(), score: z.number().nullable(), result: ResultSchema }),
  ),
  awards: z.object({
    mvp: z.object({ uid: VendorUidSchema, hero: HeroRefSchema.nullable() }).nullable(),
    svp: z.object({ uid: VendorUidSchema, hero: HeroRefSchema.nullable() }).nullable(),
  }),
  draft: z
    .array(
      z.object({
        round: z.number().int(),
        team_id: z.number().int(),
        action: z.enum(["ban", "pick"]),
        hero: HeroRefSchema.nullable(),
      }),
    )
    .nullable(),
  players: z.array(
    z.object({
      uid: VendorUidSchema,
      name: z.string().nullable(),
      team_id: z.number().int(),
      result: ResultSchema,
      is_ai: z.boolean(),
      left_game: z.boolean(),
      kills: z.number(),
      deaths: z.number(),
      assists: z.number(),
      kda: z.number().nullable(),
      accuracy: z.number().nullable(),
      damage: z.number(),
      healing: z.number(),
      damage_taken: z.number(),
      final_hits: z.number(),
      mvp: z.boolean(),
      svp: z.boolean(),
      rank: RankTransitionSchema.nullable(),
      heroes: z.array(HeroSegmentSchema),
    }),
  ),
});

export const LeaderboardResponseSchema = z.object({
  season: SeasonRefSchema,
  device_type: z.enum(["pc", "ps", "xbox"]),
  entries: z.array(
    z.object({
      position: z.number().int(),
      player: z.object({
        uid: VendorUidSchema,
        name: z.string().nullable(),
        head_icon: z.string().nullable(),
      }),
      rank: z.object({
        rank: z.string().nullable(),
        rank_level: z.number().int().nullable(),
        rank_score: z.number().nullable(),
        rs: z.number().nullable(),
      }),
      matches: z.number().int().nullable(),
      wins: z.number().int().nullable(),
      win_rate: z.number().nullable(),
      last_played_at: z.iso.datetime().nullable(),
    }),
  ),
});

export const HeroCatalogueSchema = z.object({
  heroes: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      role: z.string(),
      icon: z.string(),
    }),
  ),
});

export const ErrorBodySchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  detail: z.string().optional(),
});

export const CreditHeaderSchema = z
  .string()
  .regex(/^-?\d+$/)
  .transform(Number)
  .nullable()
  .catch(null);
