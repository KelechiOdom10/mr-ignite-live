import { z } from "zod";

// RivalsIsland's own uid pattern. Names aren't identities: they repeat and can hold homoglyphs.
export const UidSchema = z
  .string()
  .regex(/^[1-9][0-9]{0,19}$/)
  .brand<"Uid">();
export type Uid = z.infer<typeof UidSchema>;

export const FavouriteSchema = z.object({
  uid: UidSchema,
  name: z.string().min(1).max(64),
  addedAt: z.number().int(),
});
export type Favourite = z.infer<typeof FavouriteSchema>;
