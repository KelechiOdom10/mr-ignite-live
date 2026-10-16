import { useSyncExternalStore } from "react";

const subscribeNoop = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export function formatDay(iso: string, now: number): string {
  const d = new Date(iso);
  const day = (t: number) => new Date(t).toDateString();
  if (day(d.getTime()) === day(now)) return "Today";
  if (day(d.getTime()) === day(now + 86_400_000)) return "Tomorrow";
  if (day(d.getTime()) === day(now - 86_400_000)) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(d);
}

export function formatRelative(iso: string, now: number): string {
  const diff = Date.parse(iso) - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (abs < 60_000) return diff >= 0 ? "in under a minute" : "just now";
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), "hour");
  return rtf.format(Math.round(diff / 86_400_000), "day");
}

export function groupByDay<T>(items: T[], at: (item: T) => string | null, now: number, hydrated: boolean): [string, T[]][] {
  if (!hydrated) return items.length ? [["", items]] : [];
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const iso = at(item);
    const key = iso ? formatDay(iso, now) : "Date TBD";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups];
}
