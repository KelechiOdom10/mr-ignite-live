import { defineHandler } from "void";

import { FavouriteSchema, UidSchema } from "@/domain/player";

import { favourites } from "../../../src/players";

const SaveBody = FavouriteSchema.pick({ name: true });

export const PUT = defineHandler.withValidator({ body: SaveBody })(async (c, { body }) => {
  const uid = UidSchema.safeParse(c.req.param("uid"));
  if (!uid.success) return c.json({ error: "Invalid player uid" }, 400);
  await favourites.save({ uid: uid.data, name: body.name, addedAt: Date.now() });
  return { saved: true };
});

export const DELETE = defineHandler(async (c) => {
  const uid = UidSchema.safeParse(c.req.param("uid"));
  if (!uid.success) return c.json({ error: "Invalid player uid" }, 400);
  await favourites.remove(uid.data);
  return { removed: true };
});
