import type { Favourite, Uid } from "@/domain/player";

export interface FavouriteStore {
  list(): Promise<Favourite[]>;
  /** Idempotent: saving an existing favourite refreshes its name. */
  save(favourite: Favourite): Promise<void>;
  remove(uid: Uid): Promise<void>;
}
