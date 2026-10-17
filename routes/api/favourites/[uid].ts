import { defineHandler } from "void";
import { z } from "zod";

import { FavouriteSchema, UidSchema } from "@/domain/player";

import { favourites } from "../../../src/players";

const Params = z.object({ uid: UidSchema });
const SaveBody = FavouriteSchema.pick({ name: true });

export const PUT = defineHandler.withValidator({ params: Params, body: SaveBody })(async (
  _c,
  { params, body },
) => {
  await favourites.save({ uid: params.uid, name: body.name, addedAt: Date.now() });
  return { saved: true };
});

export const DELETE = defineHandler.withValidator({ params: Params })(async (_c, { params }) => {
  await favourites.remove(params.uid);
  return { removed: true };
});
