import { useShared } from "@void/react";
import { useSyncExternalStore } from "react";

import { Switch } from "@/components/motion/switch";
import { matchState } from "@/domain/matchState";
import { matchView, type MatchView, type SlotFeeders } from "@/domain/matchView";
import type { Match } from "@/domain/model";

import { SPOILER_COOKIE, spoilerCookie, spoilersHiddenIn } from "./spoilerCookie";

const STORAGE_KEY = "ignite-live:hide-spoilers";
const listeners = new Set<() => void>();

function hasCookie(): boolean {
  return document.cookie.split(";").some((pair) => pair.trim().startsWith(`${SPOILER_COOKIE}=`));
}

function subscribe(listener: () => void) {
  if (!hasCookie() && read()) document.cookie = spoilerCookie(true);
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function read(): boolean {
  if (hasCookie()) return spoilersHiddenIn(document.cookie);
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

function write(hidden: boolean) {
  document.cookie = spoilerCookie(hidden);
  window.localStorage.setItem(STORAGE_KEY, hidden ? "1" : "0");
  for (const l of listeners) l();
}

export function useSpoilersHidden(): boolean {
  const { spoilersHidden } = useShared();
  return useSyncExternalStore(subscribe, read, () => spoilersHidden);
}

export function useMatchView(match: Match, now: number, feeders?: SlotFeeders): MatchView {
  return matchView(match, matchState(match, now), useSpoilersHidden(), feeders);
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
