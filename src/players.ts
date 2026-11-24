import { env } from "void/env";

import type { Snapshot } from "@/domain/model";
import type { Favourite, LeaderboardRow, PlayerCard, PlayerProblem } from "@/domain/player";
import { scopeSnapshot } from "@/domain/scope";
import { createRivalsTrackerClient, type RivalsTrackerClient } from "@/rivalstracker/client";
import { NotConfiguredError, problemOf } from "@/rivalstracker/errors";
import { toLeaderboard, toPlayerCard } from "@/rivalstracker/toDomain";
import { d1FavouriteStore, d1PlayerCache, d1RequestLedger } from "@/store/d1";
import {
  createPlayerData,
  type PlayerCache,
  type PlayerData,
  type RequestLedger,
} from "@/store/playerData";

import { currentSnapshot } from "./sync";

export const favourites = d1FavouriteStore;

interface PlayerDataDeps {
  client: RivalsTrackerClient;
  cache: PlayerCache;
  ledger: RequestLedger;
}

const notConfigured = (message: string): RivalsTrackerClient => ({
  call: () => Promise.reject(new NotConfiguredError(message, 0)),
});

const off = (message: string): PlayerDataDeps => ({
  client: notConfigured(message),
  cache: d1PlayerCache,
  ledger: d1RequestLedger,
});

async function dependencies(): Promise<PlayerDataDeps> {
  const mode = env.PLAYER_DATA_MODE;

  if (mode === "off") return off("PLAYER_DATA_MODE is off");

  if (mode === "fixtures") {
    // Production builds drop this branch and the fixture bundle with it. An unset mode in
    // production therefore behaves like `off`, never fixtures.
    if (!import.meta.env.DEV) {
      return off("Fixtures mode only runs in development; set PLAYER_DATA_MODE=live");
    }

    const [{ fakeRivalsTracker }, { memoryPlayerCache, memoryRequestLedger }] = await Promise.all([
      import("../test/fakeRivalsTracker"),
      import("../test/memoryPlayerDb"),
    ]);

    return {
      client: createRivalsTrackerClient({ fetch: fakeRivalsTracker().fetch }),
      cache: memoryPlayerCache(),
      ledger: memoryRequestLedger(),
    };
  }

  return { client: createRivalsTrackerClient(), cache: d1PlayerCache, ledger: d1RequestLedger };
}

let playerData: Promise<ReturnType<typeof createPlayerData>> | null = null;

/** One instance per isolate, so concurrent loaders share its in-flight requests. */
export function players() {
  playerData ??= dependencies().then((deps) =>
    createPlayerData({ ...deps, budget: env.PLAYER_DATA_REQUESTS_PER_DAY, now: Date.now }),
  );

  return playerData;
}

export function playerDataMode(): "fixtures" | "live" | "off" {
  return env.PLAYER_DATA_MODE;
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
      groups: [],
      teams: {},
    };
  }
}

export type Loaded<T> = { ok: true; value: T } | { ok: false; problem: PlayerProblem };

export async function loadPlayers<T>(read: (data: PlayerData) => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, value: await read(await players()) };
  } catch (error) {
    const problem = problemOf(error);

    if (!problem) throw error;

    return { ok: false, problem };
  }
}

/** Cards for saved players from the cache alone, so the list never spends a request. */
export async function cachedPlayerCards(saved: readonly Favourite[]): Promise<PlayerCard[]> {
  const loaded = await loadPlayers((data) =>
    Promise.all(
      saved.map(async (f) => {
        const player = await data.peek("career", { uid: f.uid });

        return toPlayerCard(f, player?.data ?? null);
      }),
    ),
  );

  return loaded.ok ? loaded.value : saved.map((f) => toPlayerCard(f, null));
}

export async function cachedLeaderboardTop(count: number): Promise<LeaderboardRow[]> {
  const loaded = await loadPlayers(async (data) => {
    const board = await data.peek("leaderboard", { device: "pc" });

    return board ? toLeaderboard(board.data, "pc", board).rows.slice(0, count) : [];
  });

  return loaded.ok ? loaded.value : [];
}
