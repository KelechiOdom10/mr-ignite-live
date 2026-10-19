import { defineHandler, defineHead, type InferProps } from "void";
import { z } from "zod";

import { problemMessage } from "@/domain/player";
import { recentHeroes, UidSchema, type HeroCareer, type HeroPlay, type Uid } from "@/domain/player";
import { COMPETITIVE } from "@/rivalsisland/endpoints";
import {
  toCareer,
  toHeroCareer,
  toHistoryPage,
  toMatchDetail,
  toProfile,
} from "@/rivalsisland/toDomain";

import {
  favourites,
  heroCatalogueOrEmpty,
  loadPlayers,
  shellSnapshot,
  type Loaded,
} from "../../src/players";

export type Props = InferProps<typeof loader>;

const QuerySchema = z.object({
  category: z.enum(["competitive", "all"]).catch("competitive"),
  page: z.coerce.number().int().min(0).max(50).catch(0),
});

function categoryId(category: "competitive" | "all"): number | null {
  return category === "competitive" ? COMPETITIVE : null;
}

function readPlayer(uid: Uid, query: z.infer<typeof QuerySchema>, refresh: boolean) {
  return Promise.all([
    loadPlayers(async (data) => {
      const [{ data: res, fetchedAt, stale, refreshFailed }, catalogue] = await Promise.all([
        data.get("career", { uid }, { refresh }),
        heroCatalogueOrEmpty(data),
      ]);

      return {
        profile: toProfile(res, catalogue),
        career: toCareer(res),
        freshness: { fetchedAt, stale },
        refreshFailed,
      };
    }),
    loadPlayers(async (data) => {
      const params = { uid, page: query.page, category: categoryId(query.category) };

      const {
        data: res,
        fetchedAt,
        stale,
        refreshFailed,
      } = await data.get("history", params, {
        refresh,
      });

      return { ...toHistoryPage(res, { fetchedAt, stale }), refreshFailed };
    }),
  ]);
}

/** Heroes from matches already cached, and any hero cards already loaded. Costs nothing. */
async function heroesFromCache(
  uid: Uid,
  matchUids: readonly string[],
  signatureHeroId: number | null,
): Promise<{ recent: HeroPlay[]; coveredMatches: number; cards: HeroCareer[] }> {
  const loaded = await loadPlayers(async (data) => {
    const catalogue = await heroCatalogueOrEmpty(data);
    const peeked = await Promise.all(matchUids.map((matchUid) => data.peek("match", { matchUid })));
    const matches = peeked.flatMap((m) => (m ? [toMatchDetail(m.data, catalogue)] : []));
    const recent = recentHeroes(uid, matches);

    const ids = [...new Set([signatureHeroId, ...recent.map((h) => h.id)])].filter(
      (id): id is number => id !== null,
    );

    const cards = await Promise.all(
      ids.map(async (heroId) => {
        const card = await data.peek("heroCareer", { uid, heroId });

        return card
          ? [toHeroCareer(card.data, catalogue, { fetchedAt: card.fetchedAt, stale: card.stale })]
          : [];
      }),
    );

    return { recent, coveredMatches: matches.length, cards: cards.flat() };
  });

  return loaded.ok ? loaded.value : { recent: [], coveredMatches: 0, cards: [] };
}

/** A private history or career answering again is a successful refresh; anything else that failed isn't. */
function refreshDidNotHappen(result: Loaded<{ refreshFailed: boolean }>): boolean {
  if (result.ok) return result.value.refreshFailed;

  return result.problem !== "history_private" && result.problem !== "career_private";
}

export const loader = defineHandler(async (c) => {
  const uid = UidSchema.safeParse(c.req.param("uid"));

  const query = QuerySchema.parse({
    category: c.req.query("category"),
    page: c.req.query("page"),
  });

  const snapshot = await shellSnapshot();

  if (!uid.success) {
    c.set("notFound", true);

    return {
      snapshot,
      uid: null,
      query,
      player: null,
      history: null,
      heroes: null,
      isFavourite: false,
    };
  }

  const [[player, history], saved] = await Promise.all([
    readPlayer(uid.data, query, false),
    favourites.list(),
  ]);

  if (!player.ok && player.problem === "not_found") c.set("notFound", true);
  const isFavourite = saved.some((f) => f.uid === uid.data);

  const heroes = await heroesFromCache(
    uid.data,
    history.ok ? history.value.rows.map((r) => r.matchUid) : [],
    player.ok ? (player.value.profile.signatureHero?.id ?? null) : null,
  );

  return { snapshot, uid: uid.data, query, player, history, heroes, isFavourite };
});

const ActionBody = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("refresh"),
    category: z.enum(["competitive", "all"]),
    page: z.number().int().min(0).max(50),
  }),
  z.object({ intent: z.literal("favourite"), name: z.string().min(1).max(64) }),
  z.object({ intent: z.literal("unfavourite") }),
  z.object({ intent: z.literal("hero"), heroId: z.number().int().min(1).max(100_000) }),
]);

export const action = defineHandler.withValidator({ body: ActionBody })(async (c, { body }) => {
  const parsed = UidSchema.safeParse(c.req.param("uid"));

  if (!parsed.success) return c.json({ errors: { intent: "Unknown player." } }, 404);
  const uid = parsed.data;

  if (body.intent === "favourite") {
    await favourites.save({ uid, name: body.name, addedAt: Date.now() });

    return;
  }

  if (body.intent === "unfavourite") {
    await favourites.remove(uid);

    return;
  }

  if (body.intent === "hero") {
    const heroId = body.heroId;

    const loaded = await loadPlayers(async (data) => {
      const cached = await data.peek("heroCareer", { uid, heroId });

      return data.get("heroCareer", { uid, heroId }, { refresh: cached?.stale ?? false });
    });

    if (!loaded.ok) return c.json({ errors: { intent: problemMessage(loaded.problem) } }, 422);

    return;
  }

  const [player, history] = await readPlayer(uid, body, true);
  const refused = [player, history].some((r) => refreshDidNotHappen(r));

  if (refused) {
    return c.json(
      {
        errors: { intent: "Couldn't refresh: the credit budget is spent or RivalsIsland is down." },
      },
      422,
    );
  }
});

export const head = defineHead<Props>((_c, props) => ({
  title: props.player?.ok ? props.player.value.profile.name : "Player",
}));
