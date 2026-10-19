import { z } from "zod";

import {
  PracticeFocusSchema,
  ReviewLibrarySchema,
  ReviewSessionSchema,
  type ReviewLibrary,
} from "@/domain/review";

/** The browser storage a review library lives in. IndexedDB in the app; a Map in tests. */
export interface KeyValueArea {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

export const LIBRARY_KEY = "library:v1";
export const UNREADABLE_PREFIX = "library:unreadable:";

export interface LoadedLibrary {
  library: ReviewLibrary;
  /** Where entries that failed to parse were copied, or null when everything was readable. */
  keptAs: string | null;
  unreadable: number;
}

const StoredShape = z.object({
  sessions: z.array(z.unknown()),
  focuses: z.array(z.unknown()),
});

function partition<T>(items: readonly unknown[], schema: z.ZodType<T>) {
  const valid: T[] = [];
  const invalid: unknown[] = [];

  for (const item of items) {
    const parsed = schema.safeParse(item);

    if (parsed.success) valid.push(parsed.data);
    else invalid.push(item);
  }

  return { valid, invalid };
}

/**
 * Stored data is parsed like any external input, one review at a time, so a single bad entry
 * can't hide the rest. Anything unreadable is copied aside before it can be overwritten.
 */
export async function loadLibrary(area: KeyValueArea, now: number): Promise<LoadedLibrary> {
  const raw = await area.get(LIBRARY_KEY);

  if (raw === undefined || raw === null) {
    return { library: { sessions: [], focuses: [] }, keptAs: null, unreadable: 0 };
  }

  const shape = StoredShape.safeParse(raw);
  const stored = shape.success ? shape.data : { sessions: [], focuses: [] };
  const sessions = partition(stored.sessions, ReviewSessionSchema);
  const focuses = partition(stored.focuses, PracticeFocusSchema);
  const unreadable = sessions.invalid.length + focuses.invalid.length;

  if (shape.success && unreadable === 0) {
    return {
      library: { sessions: sessions.valid, focuses: focuses.valid },
      keptAs: null,
      unreadable,
    };
  }

  const keptAs = `${UNREADABLE_PREFIX}${now}`;
  await area.set(keptAs, raw);

  return {
    library: { sessions: sessions.valid, focuses: focuses.valid },
    keptAs,
    unreadable: shape.success ? unreadable : 1,
  };
}

export class UnsavableLibraryError extends Error {}

/** Refuses anything `loadLibrary` would reject, so the writer can't store what the reader hides. */
export function saveLibrary(area: KeyValueArea, library: ReviewLibrary): Promise<void> {
  if (!ReviewLibrarySchema.safeParse(library).success) {
    return Promise.reject(new UnsavableLibraryError("Review library failed its own schema"));
  }

  return area.set(LIBRARY_KEY, library);
}

const DB_NAME = "rivals-hub-review";
const STORE = "kv";

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.addEventListener("success", () => resolve(req.result));
    req.addEventListener("error", () => reject(req.error));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  const req = indexedDB.open(DB_NAME, 1);
  req.addEventListener("upgradeneeded", () => {
    if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
  });

  return request(req);
}

export function indexedDbArea(): KeyValueArea {
  let db: Promise<IDBDatabase> | null = null;

  const store = async (mode: IDBTransactionMode) => {
    db ??= openDatabase();

    return (await db).transaction(STORE, mode).objectStore(STORE);
  };

  return {
    async get(key) {
      return request((await store("readonly")).get(key));
    },
    async set(key, value) {
      await request((await store("readwrite")).put(value, key));
    },
  };
}
