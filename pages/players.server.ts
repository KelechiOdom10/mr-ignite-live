import { defineHandler, defineHead, type InferProps } from "void";
import { z } from "zod";

import { PlayerNameQuerySchema, problemMessage, searchPrefill } from "@/domain/player";
import { toSearchPlayer } from "@/rivalstracker/toDomain";

import {
  cachedLeaderboardTop,
  cachedPlayerCards,
  favourites,
  loadPlayers,
  shellSnapshot,
} from "../src/players";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const [snapshot, saved, top] = await Promise.all([
    shellSnapshot(),
    favourites.list(),
    cachedLeaderboardTop(5),
  ]);

  const prefill = searchPrefill(c.req.query("name"), c.req.query("focus"));

  return { snapshot, favourites: await cachedPlayerCards(saved), top, prefill };
});

const SearchBody = z.object({ name: PlayerNameQuerySchema });

export const action = defineHandler.withValidator({ body: SearchBody })(async (c, { body }) => {
  const found = await loadPlayers(
    async (data) => (await data.get("search", { name: body.name })).data,
  );

  if (!found.ok) return c.json({ errors: { name: problemMessage(found.problem) } }, 422);
  const player = toSearchPlayer(found.value);

  if (!player) return c.json({ errors: { name: `No player is named “${body.name}”.` } }, 422);

  return c.redirect(`/player/${player.uid}`);
});

export const head = defineHead(() => ({ title: "Players" }));
