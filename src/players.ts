import { env } from "void/env";

import { createRivalsIslandClient, type RivalsIslandClient } from "@/rivalsisland/client";
import { NotConfiguredError } from "@/rivalsisland/errors";
import { d1CreditLedger, d1FavouriteStore, d1PlayerCache } from "@/store/d1";
import { createPlayerData, type CreditLedger, type PlayerCache } from "@/store/playerData";

export const favourites = d1FavouriteStore;

interface PlayerDataDeps {
  client: RivalsIslandClient;
  cache: PlayerCache;
  ledger: CreditLedger;
}

const notConfigured = (message: string): RivalsIslandClient => ({
  call: () => Promise.reject(new NotConfiguredError(message, 0)),
});

async function dependencies(): Promise<PlayerDataDeps> {
  if (env.RIVALSISLAND_MODE === "fixtures") {
    // Production builds drop this branch and the fixture bundle with it.
    if (!import.meta.env.DEV) {
      const client = notConfigured(
        "Fixtures mode only runs in development; set RIVALSISLAND_MODE=live",
      );
      return { client, cache: d1PlayerCache, ledger: d1CreditLedger };
    }
    const [{ fakeRivalsIsland }, { memoryPlayerCache, memoryCreditLedger }] = await Promise.all([
      import("../test/fakeRivalsIsland"),
      import("../test/memoryPlayerDb"),
    ]);
    // Replayed calls never touch the real cache or credit ledger.
    return {
      client: createRivalsIslandClient({ apiKey: "fixtures", fetch: fakeRivalsIsland().fetch }),
      cache: memoryPlayerCache(),
      ledger: memoryCreditLedger(),
    };
  }
  const apiKey = env.RIVALSISLAND_API_KEY;
  const client = apiKey
    ? createRivalsIslandClient({ apiKey })
    : notConfigured("RIVALSISLAND_API_KEY is not set");
  return { client, cache: d1PlayerCache, ledger: d1CreditLedger };
}

let playerData: Promise<ReturnType<typeof createPlayerData>> | null = null;

/** One instance per isolate, so concurrent loaders share its in-flight requests. */
export function players() {
  playerData ??= dependencies().then((deps) =>
    createPlayerData({ ...deps, budget: env.RIVALSISLAND_CREDIT_BUDGET, now: Date.now }),
  );
  return playerData;
}

export function rivalsIslandMode(): "fixtures" | "live" {
  return env.RIVALSISLAND_MODE;
}
