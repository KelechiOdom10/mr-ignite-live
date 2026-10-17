import { z } from "zod";

// RivalsIsland's own uid pattern. Names aren't identities: they repeat and can hold homoglyphs.
export const UidSchema = z
  .string()
  .regex(/^[1-9][0-9]{0,19}$/)
  .brand<"Uid">();
export type Uid = z.infer<typeof UidSchema>;

export const FavouriteSchema = z.object({
  uid: UidSchema,
  name: z.string().min(1).max(64),
  addedAt: z.number().int(),
});
export type Favourite = z.infer<typeof FavouriteSchema>;

export const DeviceSchema = z.enum(["pc", "ps", "xbox"]);
export type Device = z.infer<typeof DeviceSchema>;

/** Why player data couldn't be shown. Private history and career are ordinary states, not failures. */
export const PlayerProblemSchema = z.enum([
  "history_private",
  "career_private",
  "not_found",
  "budget_reached",
  "out_of_credits",
  "not_configured",
  "unavailable",
]);
export type PlayerProblem = z.infer<typeof PlayerProblemSchema>;

export const FreshnessSchema = z.object({ fetchedAt: z.number().int(), stale: z.boolean() });
export type Freshness = z.infer<typeof FreshnessSchema>;

export const RankSchema = z.object({
  name: z.string().nullable(),
  level: z.number().int().nullable(),
  score: z.number().nullable(),
});
export type Rank = z.infer<typeof RankSchema>;

export const LeaderboardRowSchema = z.object({
  position: z.number().int(),
  uid: UidSchema,
  name: z.string(),
  iconUrl: z.string().nullable(),
  rank: RankSchema,
  matches: z.number().int().nullable(),
  winRate: z.number().nullable(),
  lastPlayedAt: z.iso.datetime().nullable(),
});
export type LeaderboardRow = z.infer<typeof LeaderboardRowSchema>;

export const LeaderboardSchema = z.object({
  season: z.string().nullable(),
  device: DeviceSchema,
  rows: z.array(LeaderboardRowSchema),
  freshness: FreshnessSchema,
});
export type Leaderboard = z.infer<typeof LeaderboardSchema>;
