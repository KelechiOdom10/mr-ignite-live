import { env } from "void/env";

import type { Snapshot } from "@/domain/model";
import type { PlayerProblem } from "@/domain/player";
import { scopeSnapshot } from "@/domain/scope";
import { createRivalsIslandClient, type RivalsIslandClient } from "@/rivalsisland/client";
import {
  CreditBudgetExceededError,
  NotConfiguredError,
  problemOf,
  RivalsIslandError,
} from "@/rivalsisland/errors";
import { toHeroCatalogue, type HeroCatalogue } from "@/rivalsisland/toDomain";
import { d1CreditLedger, d1FavouriteStore, d1PlayerCache } from "@/store/d1";
import {
  createPlayerData,
  type CreditLedger,
  type PlayerCache,
  type PlayerData,
} from "@/store/playerData";

import { currentSnapshot } from "./sync";

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

/** The esports snapshot for the shared header; player pages still render if the Liquipedia sync is down. */
export async function shellSnapshot(): Promise<Snapshot> {
  try {
    return scopeSnapshot(await currentSnapshot(), { kind: "events" }, Date.now());
  } catch (error) {
    console.error("Esports snapshot unavailable on a players page", error);
    const now = new Date().toISOString();
    return {
      builtAt: now,
      servedAt: now,
      liquipediaUpdatedAt: null,
      events: [],
      matches: [],
      teams: {},
    };
  }
}

export type Loaded<T> = { ok: true; value: T } | { ok: false; problem: PlayerProblem };

/** Runs a player-data read and maps a known RivalsIsland failure to a state the page can show. */
export async function loadPlayers<T>(read: (data: PlayerData) => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, value: await read(await players()) };
  } catch (error) {
    const problem = problemOf(error);
    if (!problem) throw error;
    return { ok: false, problem };
  }
}

/** Hero names, roles and icons are a nice-to-have: without them pages fall back to what each response carries. */
export async function heroCatalogueOrEmpty(data: PlayerData): Promise<HeroCatalogue> {
  try {
    return toHeroCatalogue((await data.get("heroes", {})).data);
  } catch (error) {
    if (error instanceof RivalsIslandError || error instanceof CreditBudgetExceededError) {
      return new Map();
    }
    throw error;
  }
}
