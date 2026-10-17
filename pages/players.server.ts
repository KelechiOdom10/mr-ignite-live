import { defineHandler, defineHead, type InferProps } from "void";
import { z } from "zod";

import { problemMessage } from "@/domain/player";
import { linkableUid } from "@/rivalsisland/toDomain";

import { favourites, loadPlayers, shellSnapshot } from "../src/players";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async () => {
  const [snapshot, saved] = await Promise.all([shellSnapshot(), favourites.list()]);
  return { snapshot, favourites: saved };
});

const SearchBody = z.object({ name: z.string().trim().min(1).max(16) });

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
