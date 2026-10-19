import { z } from "zod";

// RivalsIsland's own uid pattern. Names aren't identities: they repeat and can hold homoglyphs.
export const UidSchema = z
  .string()
  .regex(/^[1-9][0-9]{0,19}$/)
  .brand<"Uid">();

export type Uid = z.infer<typeof UidSchema>;

export const MatchUidSchema = z.string().regex(/^[0-9_]{5,80}$/);

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

export const PROBLEM_MESSAGES: Record<PlayerProblem, { title: string; detail: string }> = {
  history_private: {
    title: "Match history is private",
    detail: "This player hides their matches. Rank and career stats still show.",
  },
  career_private: {
    title: "Career is private",
    detail: "This player hides their career stats.",
  },
  not_found: { title: "Not found", detail: "RivalsIsland has no record of this." },
  budget_reached: {
    title: "Credit budget reached",
    detail: "Rivals Hub has used its RivalsIsland credit budget. Cached data still shows.",
  },
  out_of_credits: {
    title: "Out of RivalsIsland credits",
    detail: "The API key has no credits left.",
  },
  not_configured: {
    title: "RivalsIsland isn't set up",
    detail: "Add RIVALSISLAND_API_KEY and RIVALSISLAND_MODE=live to .env.",
  },
  unavailable: {
    title: "RivalsIsland is unavailable",
    detail: "It didn't answer as expected. Try again in a few minutes.",
  },
};

export function problemMessage(problem: PlayerProblem): string {
  const { title, detail } = PROBLEM_MESSAGES[problem];

  return `${title}. ${detail}`;
}

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

export const HeroRoleSchema = z.enum(["Vanguard", "Duelist", "Strategist"]);

export type HeroRole = z.infer<typeof HeroRoleSchema>;

export const HeroSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  role: HeroRoleSchema.nullable(),
  iconUrl: z.string().nullable(),
});

export type Hero = z.infer<typeof HeroSchema>;

export const PlayerProfileSchema = z.object({
  uid: UidSchema,
  name: z.string(),
  level: z.number().int().nullable(),
  club: z.string().nullable(),
  iconUrl: z.string().nullable(),
  signatureHero: HeroSchema.nullable(),
  season: z.string().nullable(),
  rank: RankSchema,
  peakRank: RankSchema,
  seasonWins: z.number().int().nullable(),
  seasonMatches: z.number().int().nullable(),
  lastOnline: z.iso.datetime().nullable(),
});

export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;

export const CareerSchema = z.object({
  matches: z.number().int(),
  wins: z.number().int(),
  winRate: z.number().nullable(),
  playSeconds: z.number(),
  kills: z.number().int(),
  deaths: z.number().int(),
  assists: z.number().int(),
  kda: z.number().nullable(),
  accuracy: z.number().nullable(),
  damage: z.number(),
  healing: z.number(),
  mvp: z.number().int(),
  svp: z.number().int(),
  kd: z.number().nullable(),
  finalHits: z.number().int(),
  headshotKills: z.number().int(),
  soloKills: z.number().int(),
  bestKillStreak: z.number().int(),
});

export type Career = z.infer<typeof CareerSchema>;

export const ResultSchema = z.enum(["win", "loss", "draw", "abandoned"]);

export type Result = z.infer<typeof ResultSchema>;

export const HistoryRowSchema = z.object({
  matchUid: z.string(),
  playedAt: z.iso.datetime(),
  season: z.string().nullable(),
  mode: z.string().nullable(),
  map: z.string().nullable(),
  category: z.string().nullable(),
  result: ResultSchema,
  score: z.object({ us: z.number(), them: z.number() }).nullable(),
  kills: z.number(),
  deaths: z.number(),
  assists: z.number(),
  kda: z.number().nullable(),
  mvp: z.boolean(),
  svp: z.boolean(),
  leftGame: z.boolean(),
  rankChange: z.number().nullable(),
  /** Rank after the match. `ladder` is RivalsIsland's running rank score, which climbs across tiers. */
  rankAfter: z
    .object({ name: z.string().nullable(), score: z.number().nullable(), ladder: z.number() })
    .nullable(),
  device: DeviceSchema.nullable(),
  durationSeconds: z.number(),
});

export type HistoryRow = z.infer<typeof HistoryRowSchema>;

export const HistoryPageSchema = z.object({
  rows: z.array(HistoryRowSchema),
  page: z.number().int(),
  hasMore: z.boolean(),
  freshness: FreshnessSchema,
});

export type HistoryPage = z.infer<typeof HistoryPageSchema>;

export const HeroPlaySchema = HeroSchema.extend({ playSeconds: z.number() });

export type HeroPlay = z.infer<typeof HeroPlaySchema>;

export const MatchPlayerSchema = z.object({
  /** null for bots and players we can't link to. */
  uid: UidSchema.nullable(),
  name: z.string(),
  isAi: z.boolean(),
  leftGame: z.boolean(),
  kills: z.number(),
  deaths: z.number(),
  assists: z.number(),
  damage: z.number(),
  healing: z.number(),
  damageTaken: z.number(),
  accuracy: z.number().nullable(),
  mvp: z.boolean(),
  svp: z.boolean(),
  heroes: z.array(HeroPlaySchema),
});

export type MatchPlayer = z.infer<typeof MatchPlayerSchema>;

export const MatchTeamSchema = z.object({
  id: z.number().int(),
  score: z.number().nullable(),
  result: ResultSchema,
  players: z.array(MatchPlayerSchema),
});

export const DraftActionSchema = z.object({
  round: z.number().int(),
  teamId: z.number().int(),
  action: z.enum(["ban", "pick"]),
  hero: HeroSchema.nullable(),
});

export const MatchDetailSchema = z.object({
  matchUid: z.string(),
  playedAt: z.iso.datetime(),
  mode: z.string().nullable(),
  map: z.string().nullable(),
  category: z.string().nullable(),
  season: z.string().nullable(),
  durationSeconds: z.number(),
  teams: z.array(MatchTeamSchema),
  draft: z.array(DraftActionSchema),
});

export type MatchDetail = z.infer<typeof MatchDetailSchema>;

export const HeroCareerSchema = z.object({
  hero: HeroSchema,
  matches: z.number(),
  winRate: z.number().nullable(),
  playSeconds: z.number(),
  kda: z.number().nullable(),
  kills: z.number().int(),
  deaths: z.number().int(),
  assists: z.number().int(),
  mvp: z.number().int(),
  svp: z.number().int(),
  freshness: FreshnessSchema,
});

export type HeroCareer = z.infer<typeof HeroCareerSchema>;

/**
 * Heroes a player used across matches we already hold, most played first. RivalsIsland has no
 * free per-player hero ranking, so this only covers cached matches and says how many.
 */
export function recentHeroes(uid: Uid, matches: readonly MatchDetail[], limit = 3): HeroPlay[] {
  const byHero = new Map<number, HeroPlay>();

  for (const match of matches) {
    for (const player of match.teams.flatMap((t) => t.players)) {
      if (player.uid !== uid) continue;

      for (const hero of player.heroes) {
        const seen = byHero.get(hero.id);
        byHero.set(hero.id, { ...hero, playSeconds: (seen?.playSeconds ?? 0) + hero.playSeconds });
      }
    }
  }

  return [...byHero.values()].sort((a, b) => b.playSeconds - a.playSeconds).slice(0, limit);
}

/** Below this many matches a season win rate is noise, so it isn't shown. */
export const MIN_MATCHES_FOR_WIN_RATE = 10;

export type SeasonRecord =
  | { kind: "unknown"; season: string | null }
  | { kind: "none"; season: string }
  | { kind: "few"; season: string; matches: number; wins: number }
  | { kind: "enough"; season: string; matches: number; wins: number; winRate: number };

/**
 * The current season's record from the profile. Rank carries over a season reset, but the match
 * count starts again, so a veteran can have one match this season: say so instead of a rate.
 */
export function seasonRecord(profile: PlayerProfile): SeasonRecord {
  const { season, seasonMatches: matches, seasonWins } = profile;

  if (season === null || matches === null) return { kind: "unknown", season };

  if (matches === 0) return { kind: "none", season };

  // A missing win count isn't zero wins.
  if (seasonWins === null) return { kind: "unknown", season };
  const wins = seasonWins;

  if (matches < MIN_MATCHES_FOR_WIN_RATE) return { kind: "few", season, matches, wins };

  return { kind: "enough", season, matches, wins, winRate: wins / matches };
}

export interface SeasonGroup {
  season: string | null;
  rows: HistoryRow[];
}

/** Consecutive history rows from the same season, newest first, so the list can mark each reset. */
export function groupBySeason(rows: readonly HistoryRow[]): SeasonGroup[] {
  const groups: SeasonGroup[] = [];

  for (const row of rows) {
    const last = groups.at(-1);

    if (last && last.season === row.season) last.rows.push(row);
    else groups.push({ season: row.season, rows: [row] });
  }

  return groups;
}

export const RecentPlayerSchema = z.object({ uid: UidSchema, name: z.string().min(1).max(64) });

export type RecentPlayer = z.infer<typeof RecentPlayerSchema>;

export const RECENT_PLAYERS_LIMIT = 8;

/** Players opened in this browser, newest first; anything malformed is dropped rather than trusted. */
export function parseRecentPlayers(raw: string | null): RecentPlayer[] {
  if (!raw) return [];

  try {
    const parsed = z.array(z.unknown()).safeParse(JSON.parse(raw));

    if (!parsed.success) return [];

    return parsed.data
      .flatMap((item) => {
        const player = RecentPlayerSchema.safeParse(item);

        return player.success ? [player.data] : [];
      })
      .slice(0, RECENT_PLAYERS_LIMIT);
  } catch {
    return [];
  }
}

export function rememberPlayer(
  list: readonly RecentPlayer[],
  player: RecentPlayer,
): RecentPlayer[] {
  return [player, ...list.filter((p) => p.uid !== player.uid)].slice(0, RECENT_PLAYERS_LIMIT);
}

/** RivalsIsland's search takes an exact in-game name of up to 16 characters. */
export const PlayerNameQuerySchema = z.string().trim().min(1).max(16);

/** A name worth offering as a ranked lookup; esports names can be longer than an in-game name. */
export function searchableName(name: string): string | null {
  const parsed = PlayerNameQuerySchema.safeParse(name);

  return parsed.success ? parsed.data : null;
}

/**
 * What /players prefills from its query. A name is never searched automatically: a search can
 * cost credits, so the reader presses Search.
 */
export function searchPrefill(name: string | undefined, focus: string | undefined) {
  const parsed = PlayerNameQuerySchema.safeParse(name ?? "");
  const prefilled = parsed.success ? parsed.data : "";

  return { name: prefilled, focus: prefilled !== "" || focus === "name" };
}
