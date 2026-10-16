import { useSyncExternalStore } from "react";

const subscribeNoop = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
    new Date(iso),
  );
}

export function formatDay(iso: string, now: number): string {
  const d = new Date(iso);
  const day = (t: number) => new Date(t).toDateString();
  if (day(d.getTime()) === day(now)) return "Today";
  if (day(d.getTime()) === day(now + 86_400_000)) return "Tomorrow";
  if (day(d.getTime()) === day(now - 86_400_000)) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(d);
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

export interface DayGroup<T> {
  key: string;
  date: string | null;
  items: T[];
}

export function groupByDay<T>(
  items: T[],
  at: (item: T) => string | null,
  hydrated: boolean,
): DayGroup<T>[] {
  if (!hydrated) return items.length ? [{ key: "all", date: null, items }] : [];
  const groups = new Map<string, DayGroup<T>>();
  for (const item of items) {
    const iso = at(item);
    const key = iso ? dayKey(iso) : "tbd";
    const group = groups.get(key) ?? { key, date: iso, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function formatCountdown(iso: string, now: number): string {
  const ms = Date.parse(iso) - now;
  if (ms <= 0) return "Starting";
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${Math.max(1, minutes)}m`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatShortRange(start: string | null, end: string | null): string {
  const fmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
  if (!start) return "Dates TBD";
  return end
    ? `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`
    : fmt.format(new Date(start));
}

export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
