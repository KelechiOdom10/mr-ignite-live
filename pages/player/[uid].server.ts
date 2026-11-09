import { defineHandler, defineHead, type InferProps } from "void";
import { z } from "zod";

import { problemMessage } from "@/domain/player";
import { recentHeroes, UidSchema, type HeroCareer, type HeroPlay, type Uid } from "@/domain/player";
import { CareerPrivateError, MatchHistoryPrivateError } from "@/rivalstracker/errors";
import {
  toCareer,
  toHeroCareer,
  toHistoryPage,
  toMatchDetail,
  toProfile,
} from "@/rivalstracker/toDomain";

import { favourites, loadPlayers, shellSnapshot, type Loaded } from "../../src/players";

export type Props = InferProps<typeof loader>;

/** A player can hide their overview or their history; each is an ordinary state, not a failure. */
function assertCareerVisible(res: { visibility: { overview: boolean; career_stats: boolean } }) {
  if (!res.visibility.overview || !res.visibility.career_stats) {
    throw new CareerPrivateError("Career is private", 0);
  }
}

function assertHistoryVisible(res: { visibility: { match_history: boolean } }) {
  if (!res.visibility.match_history) {
    throw new MatchHistoryPrivateError("Match history is private", 0);
  }
}

async function readPlayer(uid: Uid, refresh: boolean) {
  // career, history and heroCareer share one upstream request; the first read fills the cache.
  const player = await loadPlayers(async (data) => {
    const {
      data: res,
      fetchedAt,
      stale,
      refreshFailed,
    } = await data.get("career", { uid }, { refresh });

    assertCareerVisible(res);

    return {
      profile: toProfile(res),
      career: toCareer(res),
      freshness: { fetchedAt, stale },
      refreshFailed,
    };
  });

  const history = await loadPlayers(async (data) => {
    const { data: res, fetchedAt, stale, refreshFailed } = await data.get("history", { uid });

    assertHistoryVisible(res);

    return { ...toHistoryPage(res, { fetchedAt, stale }), refreshFailed };
  });

  return [player, history] as const;
}

/** Heroes from matches already cached, with the season's hero cards from the cached profile. */
async function heroesFromCache(
  uid: Uid,
  matchUids: readonly string[],
): Promise<{ recent: HeroPlay[]; coveredMatches: number; cards: HeroCareer[] }> {
  const loaded = await loadPlayers(async (data) => {
    const [player, ...peeked] = await Promise.all([
      data.peek("career", { uid }),
      ...matchUids.map((matchUid) => data.peek("match", { matchUid })),
    ]);

    const matches = peeked.flatMap((m) => (m ? [toMatchDetail(m.data)] : []));
    const recent = recentHeroes(uid, matches);

    const cards =
      player === null
        ? []
        : recent.flatMap((hero) => {
            const card = toHeroCareer(player.data, hero.id, {
              fetchedAt: player.fetchedAt,
              stale: player.stale,
            });

            return card ? [card] : [];
          });

    return { recent, coveredMatches: matches.length, cards };
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
  const snapshot = await shellSnapshot();

  if (!uid.success) {
    c.set("notFound", true);

    return {
      snapshot,
      uid: null,
      player: null,
      history: null,
      heroes: null,
      isFavourite: false,
    };
  }

  const [[player, history], saved] = await Promise.all([
    readPlayer(uid.data, false),
    favourites.list(),
  ]);

  if (!player.ok && player.problem === "not_found") c.set("notFound", true);
  const isFavourite = saved.some((f) => f.uid === uid.data);

  const heroes = await heroesFromCache(
    uid.data,
    history.ok ? history.value.rows.map((r) => r.matchUid) : [],
  );

  return { snapshot, uid: uid.data, player, history, heroes, isFavourite };
});

const ActionBody = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("refresh") }),
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

      const fetched = await data.get(
        "heroCareer",
        { uid, heroId },
        { refresh: cached?.stale ?? false },
      );

      return toHeroCareer(fetched.data, heroId, {
        fetchedAt: fetched.fetchedAt,
        stale: fetched.stale,
      });
    });

    if (!loaded.ok) return c.json({ errors: { intent: problemMessage(loaded.problem) } }, 422);

    if (!loaded.value) return c.json({ errors: { intent: "No ranked stats for that hero." } }, 422);

    return;
  }

  const [player, history] = await readPlayer(uid, true);
  const refused = [player, history].some((r) => refreshDidNotHappen(r));

  if (refused) {
    return c.json(
      {
        errors: {
          intent: "Couldn't refresh: the request budget is spent or RivalsTracker is down.",
        },
      },
      422,
    );
  }
});

export const head = defineHead<Props>((_c, props) => ({
  title: props.player?.ok ? props.player.value.profile.name : "Player",
}));
