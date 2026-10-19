import { useEffect, useSyncExternalStore } from "react";

import { parseRecentPlayers, rememberPlayer, type RecentPlayer } from "@/domain/player";

const STORAGE_KEY = "rivals-hub:recent-players";
const NONE: RecentPlayer[] = [];
const listeners = new Set<() => void>();
let cached: { raw: string | null; players: RecentPlayer[] } = { raw: null, players: NONE };

function read(): RecentPlayer[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (raw !== cached.raw) cached = { raw, players: parseRecentPlayers(raw) };

  return cached.players;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && listener();
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Players opened in this browser. Kept locally so finding them again costs no credits. */
export function useRecentPlayers(): RecentPlayer[] {
  return useSyncExternalStore(subscribe, read, () => NONE);
}

export function useRememberPlayer(player: RecentPlayer | null) {
  const uid = player?.uid;
  const name = player?.name;
  useEffect(() => {
    if (!uid || !name) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rememberPlayer(read(), { uid, name })));

    for (const l of listeners) l();
  }, [uid, name]);
}
