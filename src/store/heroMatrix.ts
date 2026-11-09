import { ProHeroStatsSchema, type ProHeroStats, toProHeroStats } from "@/domain/proHeroStats";
import {
  type MrvlClient,
  MrvlHttpError,
  MrvlResponseError,
  MrvlUnreachableError,
} from "@/mrvl/client";

import { kvKey, type KvStore } from "./kv";

export const HERO_MATRIX_KEY = kvKey("hero-matrix:v1", ProHeroStatsSchema);

const REFRESH_MS = 60 * 60 * 1000;
const WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function utcDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function heroMatrixWindow(now: number) {
  const end = utcDate(now);

  return { start: utcDate(now - (WINDOW_DAYS - 1) * DAY_MS), end };
}

export async function readHeroMatrix(store: KvStore): Promise<ProHeroStats | null> {
  const parsed = await store.get(HERO_MATRIX_KEY);

  return parsed?.success ? parsed.data : null;
}

function isFresh(stored: ProHeroStats | null, now: number): boolean {
  return stored !== null && now - Date.parse(stored.fetchedAt) < REFRESH_MS;
}

/**
 * One request an hour at most. mrvl is a courtesy source: a failure keeps the last good totals and
 * stays out of the Liquipedia sync, and only the three typed mrvl errors are swallowed here.
 */
export async function refreshHeroMatrix({
  store,
  mrvl,
  now,
}: {
  store: KvStore;
  mrvl: MrvlClient;
  now: number;
}): Promise<ProHeroStats | null> {
  const stored = await readHeroMatrix(store);

  if (isFresh(stored, now)) return stored;

  const window = heroMatrixWindow(now);

  try {
    const response = await mrvl.heroMatrix({
      startDate: window.start,
      endDate: window.end,
    });

    const next = toProHeroStats(response, {
      ...window,
      fetchedAt: new Date(now).toISOString(),
    });

    await store.put(HERO_MATRIX_KEY, next);

    return next;
  } catch (error) {
    if (
      !(
        error instanceof MrvlHttpError ||
        error instanceof MrvlResponseError ||
        error instanceof MrvlUnreachableError
      )
    )
      throw error;

    console.warn("Keeping the last mrvl hero totals until the next sync", { error: error.message });

    return stored;
  }
}
