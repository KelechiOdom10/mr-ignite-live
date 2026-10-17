import { favourite } from "@schema";
import { db, desc, eq } from "void/db";
import { z } from "zod";

import { FavouriteSchema } from "@/domain/player";

import type { FavouriteStore } from "./favourites";

export const d1FavouriteStore: FavouriteStore = {
  async list() {
    const rows = await db.select().from(favourite).orderBy(desc(favourite.addedAt));
    return z.array(FavouriteSchema).parse(rows);
  },
  async save(f) {
    await db
      .insert(favourite)
      .values(f)
      .onConflictDoUpdate({ target: favourite.uid, set: { name: f.name } });
  },
  async remove(uid) {
    await db.delete(favourite).where(eq(favourite.uid, uid));
  },
};
