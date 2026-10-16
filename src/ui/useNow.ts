import { useSyncExternalStore } from "react";

const TICK_MS = 15_000;
let current = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    current = Date.now();
    timer = setInterval(() => {
      current = Date.now();
      for (const l of listeners) l();
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

// The server's render time is used during hydration so time-derived markup matches the HTML.
export function useNow(serverNow: number): number {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => serverNow,
  );
}
