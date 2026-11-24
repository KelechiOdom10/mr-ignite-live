import { z } from "zod";

import {
  PracticeFocusSchema,
  ReviewLibrarySchema,
  ReviewSessionSchema,
  type ReviewLibrary,
} from "@/domain/review";

export interface KeyValueArea {
  /** null when nothing is stored under `key`. */
  get<T>(key: string, schema: z.ZodType<T>): Promise<z.ZodSafeParseResult<T> | null>;
  set<T>(key: string, schema: z.ZodType<T>, value: T): Promise<void>;
  /** Copies what's stored under `from` to `to` without reading it, so unreadable data survives. */
  copy(from: string, to: string): Promise<void>;
}

export const LIBRARY_KEY = "library:v1";
export const UNREADABLE_PREFIX = "library:unreadable:";

export interface LoadedLibrary {
  library: ReviewLibrary;
  /** Where entries that failed to parse were copied, or null when everything was readable. */
  keptAs: string | null;
  unreadable: number;
}

const StoredLibrarySchema = z.object({
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
  const envelope = await area.get(LIBRARY_KEY, StoredLibrarySchema);

  if (envelope === null) {
    return { library: { sessions: [], focuses: [] }, keptAs: null, unreadable: 0 };
  }

  const stored = envelope.success ? envelope.data : { sessions: [], focuses: [] };
  const sessions = partition(stored.sessions, ReviewSessionSchema);
  const focuses = partition(stored.focuses, PracticeFocusSchema);
  const unreadable = sessions.invalid.length + focuses.invalid.length;

  if (envelope.success && unreadable === 0) {
    return {
      library: { sessions: sessions.valid, focuses: focuses.valid },
      keptAs: null,
      unreadable,
    };
  }

  const keptAs = `${UNREADABLE_PREFIX}${now}`;
  await area.copy(LIBRARY_KEY, keptAs);

  return {
    library: { sessions: sessions.valid, focuses: focuses.valid },
    keptAs,
    unreadable: envelope.success ? unreadable : 1,
  };
}

export class UnsavableLibraryError extends Error {}

/** Refuses anything `loadLibrary` would reject, so the writer can't store what the reader hides. */
export async function saveLibrary(area: KeyValueArea, library: ReviewLibrary): Promise<void> {
  if (!ReviewLibrarySchema.safeParse(library).success) {
    throw new UnsavableLibraryError("Review library failed its own schema");
  }

  await area.set(LIBRARY_KEY, ReviewLibrarySchema, library);
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
    async get(key, schema) {
      const raw = await request((await store("readonly")).get(key));

      return raw === undefined ? null : schema.safeParse(raw);
    },
    async set(key, schema, value) {
      await request((await store("readwrite")).put(schema.parse(value), key));
    },
    async copy(from, to) {
      const raw = await request((await store("readonly")).get(from));

      if (raw !== undefined) await request((await store("readwrite")).put(raw, to));
    },
  };
}
