import { EMPTY_LIBRARY, ReviewLibrarySchema, type ReviewLibrary } from "@/domain/review";

/** The browser storage a review library lives in. IndexedDB in the app; a Map in tests. */
export interface KeyValueArea {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

export const LIBRARY_KEY = "library:v1";
export const UNREADABLE_PREFIX = "library:unreadable:";

export type LoadedLibrary =
  | { library: ReviewLibrary; problem: null }
  | { library: ReviewLibrary; problem: "unreadable"; keptAs: string };

/**
 * Stored data is parsed like any external input. An unreadable library is copied aside before the
 * empty one is returned, so the next save can't silently destroy a user's labels.
 */
export async function loadLibrary(area: KeyValueArea, now: number): Promise<LoadedLibrary> {
  const raw = await area.get(LIBRARY_KEY);
  if (raw === undefined || raw === null) return { library: EMPTY_LIBRARY, problem: null };
  const parsed = ReviewLibrarySchema.safeParse(raw);
  if (parsed.success) return { library: parsed.data, problem: null };
  const keptAs = `${UNREADABLE_PREFIX}${now}`;
  await area.set(keptAs, raw);
  return { library: EMPTY_LIBRARY, problem: "unreadable", keptAs };
}

export function saveLibrary(area: KeyValueArea, library: ReviewLibrary): Promise<void> {
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
