import { defineHandler, defineHead, type InferProps } from "void";
import { z } from "zod";

import { UidSchema, type Uid } from "@/domain/player";
import { COMPETITIVE } from "@/rivalsisland/endpoints";
import {
  toCareer,
  toHeroCatalogue,
  toHistoryPage,
  toProfile,
  type HeroCatalogue,
} from "@/rivalsisland/toDomain";
import type { PlayerData } from "@/store/playerData";

import { favourites, loadPlayers, shellSnapshot } from "../../src/players";

export type Props = InferProps<typeof loader>;

const QuerySchema = z.object({
  category: z.enum(["competitive", "all"]).catch("competitive"),
  page: z.coerce.number().int().min(0).max(50).catch(0),
});

function categoryId(category: "competitive" | "all"): number | null {
  return category === "competitive" ? COMPETITIVE : null;
}

async function heroCatalogue(data: PlayerData): Promise<HeroCatalogue> {
  return toHeroCatalogue((await data.get("heroes", {})).data);
}

function readPlayer(uid: Uid, query: z.infer<typeof QuerySchema>, refresh: boolean) {
  return Promise.all([
    loadPlayers(async (data) => {
      const [{ data: res, fetchedAt, stale, refreshFailed }, catalogue] = await Promise.all([
        data.get("career", { uid }, { refresh }),
        heroCatalogue(data).catch(() => new Map()),
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

export const loader = defineHandler(async (c) => {
  const uid = UidSchema.safeParse(c.req.param("uid"));
  const query = QuerySchema.parse({
    category: c.req.query("category"),
    page: c.req.query("page"),
  });
  const snapshot = await shellSnapshot();
  if (!uid.success) {
    c.set("notFound", true);
    return { snapshot, uid: null, query, player: null, history: null, isFavourite: false };
  }
  const [[player, history], saved] = await Promise.all([
    readPlayer(uid.data, query, false),
    favourites.list(),
  ]);
  if (!player.ok && player.problem === "not_found") c.set("notFound", true);
  const isFavourite = saved.some((f) => f.uid === uid.data);
  return { snapshot, uid: uid.data, query, player, history, isFavourite };
});

const ActionBody = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("refresh"),
    category: z.enum(["competitive", "all"]),
    page: z.number().int().min(0).max(50),
  }),
  z.object({ intent: z.literal("favourite"), name: z.string().min(1).max(64) }),
  z.object({ intent: z.literal("unfavourite") }),
]);

export const action = defineHandler.withValidator({ body: ActionBody })(async (c, { body }) => {
  const uid = UidSchema.parse(c.req.param("uid"));
  if (body.intent === "favourite") {
    await favourites.save({ uid, name: body.name, addedAt: Date.now() });
    return;
  }
  if (body.intent === "unfavourite") {
    await favourites.remove(uid);
    return;
  }
  const [player, history] = await readPlayer(uid, body, true);
  const refused =
    (player.ok && player.value.refreshFailed) || (history.ok && history.value.refreshFailed);
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
