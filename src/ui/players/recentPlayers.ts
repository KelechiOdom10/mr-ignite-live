import { useEffect, useSyncExternalStore } from "react";

import { parseRecentPlayers, rememberPlayer, type RecentPlayer } from "@/domain/player";

const STORAGE_KEY = "rivals-hub:recent-players";
const NONE: RecentPlayer[] = [];
const listeners = new Set<() => void>();

interface ParsedStorage {
  raw: string | null;
  players: RecentPlayer[];
}

let cached: ParsedStorage = { raw: null, players: NONE };

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
  // Primitives, so the effect runs when what's shown changes, not on every render.
  const uid = player?.uid;
  const name = player?.name;
  const iconUrl = player?.iconUrl ?? null;
  const rankName = player?.rank?.name ?? null;
  const rankLevel = player?.rank?.level ?? null;
  const rankScore = player?.rank?.score ?? null;
  const device = player?.device ?? null;

  useEffect(() => {
    if (!uid || !name) return;
    const rank = rankName ? { name: rankName, level: rankLevel, score: rankScore } : null;
    const next = rememberPlayer(read(), { uid, name, iconUrl, rank, device });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    for (const l of listeners) l();
  }, [uid, name, iconUrl, rankName, rankLevel, rankScore, device]);
}
