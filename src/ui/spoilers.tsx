import { useSyncExternalStore } from "react";

import { Switch } from "@/components/motion/switch";

const KEY = "ignite-live:hide-spoilers";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function read(): boolean {
  return window.localStorage.getItem(KEY) === "1";
}

function write(hidden: boolean) {
  window.localStorage.setItem(KEY, hidden ? "1" : "0");
  for (const l of listeners) l();
}

export function useSpoilersHidden(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}

export function SpoilerToggle({ compact = false }: { compact?: boolean }) {
  const hidden = useSpoilersHidden();
  return (
    <Switch
      checked={hidden}
      onCheckedChange={write}
      label={compact ? undefined : "Hide spoilers"}
      ariaLabel="Hide scores and results"
    />
  );
}
