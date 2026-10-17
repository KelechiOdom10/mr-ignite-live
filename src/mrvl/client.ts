import { z } from "zod";

export const MRVL_QUERY_URL = "https://bold-walrus-4.convex.cloud/api/query";
const USER_AGENT = "RivalsHub/0.1 (personal Marvel Rivals site)";

export class MrvlHttpError extends Error {
  override name = "MrvlHttpError";
  constructor(
    readonly status: number,
    readonly path: string,
  ) {
    super(`mrvl returned HTTP ${status} for ${path}`);
  }
}

export class MrvlResponseError extends Error {
  override name = "MrvlResponseError";
  constructor(
    readonly path: string,
    readonly detail: string,
  ) {
    super(`Unexpected mrvl response for ${path}: ${detail}`);
  }
}

const HeroSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string().nullish(),
  portraitUrl: z.string().nullish(),
});

const PlayerStatsNumbersSchema = z.object({
  kills: z.number().nullish(),
  deaths: z.number().nullish(),
  assists: z.number().nullish(),
  finalHits: z.number().nullish(),
  damage: z.number().nullish(),
  damageTaken: z.number().nullish(),
  healing: z.number().nullish(),
  accuracy: z.number().nullish(),
});

const ScoreboardPlayerSchema = z.object({
  name: z.string(),
  linkedPlayerName: z.string().nullish(),
  linkedNationality: z.string().nullish(),
  hero: HeroSchema.nullish(),
  heroesPlayed: z
    .array(z.object({ hero: HeroSchema, playTimeSeconds: z.number().nullish() }))
    .nullish(),
  stats: PlayerStatsNumbersSchema.nullish(),
  isMvp: z.boolean().nullish(),
  isSvp: z.boolean().nullish(),
});

const DraftPickSchema = z.object({
  hero: HeroSchema,
  kind: z.string(),
  teamCamp: z.number().nullish(),
});

const ScoreboardTeamSchema = z.object({
  camp: z.number(),
  name: z.string(),
  shortName: z.string().nullish(),
  linkedTeamName: z.string().nullish(),
  isWinner: z.boolean().nullish(),
  score: z.number().nullish(),
  bans: z.array(DraftPickSchema).nullish(),
  players: z.array(ScoreboardPlayerSchema),
});

const GameSchema = z.object({
  gameNumber: z.number(),
  map: z.string().nullish(),
  teamOneScore: z.number().nullish(),
  teamTwoScore: z.number().nullish(),
  scoreboard: z
    .object({
      durationSeconds: z.number().nullish(),
      map: z.object({ name: z.string() }).nullish(),
      teams: z.array(ScoreboardTeamSchema),
    })
    .nullish(),
});

export const MrvlMatchSummarySchema = z.object({
  id: z.string(),
  teamOneName: z.string().nullish(),
  teamTwoName: z.string().nullish(),
  teamOneSearchNames: z.array(z.string()).nullish(),
  teamTwoSearchNames: z.array(z.string()).nullish(),
  teamOneSnapshot: z.object({ name: z.string().nullish(), tag: z.string().nullish() }).nullish(),
  teamTwoSnapshot: z.object({ name: z.string().nullish(), tag: z.string().nullish() }).nullish(),
  scheduledAt: z.string().nullish(),
  status: z.string().nullish(),
  isLive: z.boolean().nullish(),
  updatedAt: z.union([z.string(), z.number()]).nullish(),
});
export type MrvlMatchSummary = z.infer<typeof MrvlMatchSummarySchema>;

export const MrvlMatchPageSchema = z.object({
  match: MrvlMatchSummarySchema.extend({ games: z.array(GameSchema) }),
});
export type MrvlMatchPage = z.infer<typeof MrvlMatchPageSchema>;
export type MrvlGame = z.infer<typeof GameSchema>;
export type MrvlScoreboardTeam = z.infer<typeof ScoreboardTeamSchema>;

const EnvelopeSchema = z.object({
  status: z.string(),
  value: z.unknown().optional(),
  errorMessage: z.string().optional(),
});

export interface MrvlClientOptions {
  fetch?: typeof fetch;
}

export type MrvlClient = ReturnType<typeof createMrvlClient>;

export function createMrvlClient(options: MrvlClientOptions = {}) {
  const doFetch = options.fetch ?? fetch;

  async function query<S extends z.ZodType>(
    schema: S,
    path: string,
    args: Record<string, unknown>,
  ): Promise<z.infer<S>> {
    const res = await doFetch(MRVL_QUERY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify({ path, args, format: "json" }),
    });
    if (!res.ok) throw new MrvlHttpError(res.status, path);
    const envelope = EnvelopeSchema.safeParse(await res.json());
    if (!envelope.success) throw new MrvlResponseError(path, "not a Convex envelope");
    if (envelope.data.status !== "success") {
      throw new MrvlResponseError(path, envelope.data.errorMessage ?? envelope.data.status);
    }
    const parsed = schema.safeParse(envelope.data.value);
    if (!parsed.success)
      throw new MrvlResponseError(path, parsed.error.issues[0]?.message ?? "shape");
    return parsed.data;
  }

  return {
    listMatches(status: "live" | "recent" | "upcoming", limit: number) {
      return query(z.array(MrvlMatchSummarySchema), "matches:listSummary", { status, limit });
    },
    matchPage(id: string) {
      return query(MrvlMatchPageSchema, "matches:getPageData", { id });
    },
  };
}
