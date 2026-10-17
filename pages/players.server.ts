import { defineHandler, defineHead, type InferProps } from "void";
import { z } from "zod";

import { PlayerNameQuerySchema, problemMessage } from "@/domain/player";
import { linkableUid } from "@/rivalsisland/toDomain";

import { favourites, loadPlayers, shellSnapshot } from "../src/players";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const [snapshot, saved] = await Promise.all([shellSnapshot(), favourites.list()]);
  // Prefilled, never submitted: a search can cost credits, so the reader presses Search.
  const name = PlayerNameQuerySchema.catch("").parse(c.req.query("name") ?? "");
  const focus = name !== "" || c.req.query("focus") === "name";
  return { snapshot, favourites: saved, prefill: { name, focus } };
});

const SearchBody = z.object({ name: PlayerNameQuerySchema });

export const action = defineHandler.withValidator({ body: SearchBody })(async (c, { body }) => {
  const found = await loadPlayers(
    async (data) => (await data.get("search", { name: body.name })).data,
  );
  if (!found.ok) return c.json({ errors: { name: problemMessage(found.problem) } }, 422);
  const uid = found.value.player ? linkableUid(found.value.player.uid) : null;
  if (!uid) return c.json({ errors: { name: `No player is named “${body.name}”.` } }, 422);
  return c.redirect(`/player/${uid}`);
});

export const head = defineHead(() => ({ title: "Players" }));
