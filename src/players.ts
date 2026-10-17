import { env } from "void/env";

import { createRivalsIslandClient, type RivalsIslandClient } from "@/rivalsisland/client";
import { NotConfiguredError } from "@/rivalsisland/errors";
import { d1CreditLedger, d1FavouriteStore, d1PlayerCache } from "@/store/d1";
import { createPlayerData } from "@/store/playerData";

export const favourites = d1FavouriteStore;

async function rivalsIslandClient(): Promise<RivalsIslandClient> {
  if (env.RIVALSISLAND_MODE === "fixtures") {
    const { fakeRivalsIsland } = await import("../test/fakeRivalsIsland");
    return createRivalsIslandClient({ apiKey: "fixtures", fetch: fakeRivalsIsland().fetch });
  }
  const apiKey = env.RIVALSISLAND_API_KEY;
  if (!apiKey) {
    return {
      call: () => Promise.reject(new NotConfiguredError("RIVALSISLAND_API_KEY is not set", 0)),
    };
  }
  return createRivalsIslandClient({ apiKey });
}

let playerData: Promise<ReturnType<typeof createPlayerData>> | null = null;

/** One instance per isolate, so concurrent loaders share its in-flight requests. */
export function players() {
  playerData ??= rivalsIslandClient().then((client) =>
    createPlayerData({
      client,
      cache: d1PlayerCache,
      ledger: d1CreditLedger,
      budget: env.RIVALSISLAND_CREDIT_BUDGET,
      now: Date.now,
    }),
  );
  return playerData;
}

export function rivalsIslandMode(): "fixtures" | "live" {
  return env.RIVALSISLAND_MODE;
}
