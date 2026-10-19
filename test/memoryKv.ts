import type { KvStore } from "@/store/kv";

import type { Json } from "./fixtures";

export interface MemoryKvStore extends KvStore {
  /** Puts per key since creation or the last `resetPuts()`. */
  putCounts(): Record<string, number>;
  resetPuts(): void;
}

// Values round-trip through JSON and the key's schema, as void/kv and voidKvStore do, so a value KV
// can't hold fails here too. `initial` seeds raw values, which may not match the current schema.
export function memoryKvStore(initial: Record<string, Json> = {}): MemoryKvStore {
  const values = new Map<string, string>(
    Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]),
  );

  let puts: Record<string, number> = {};

  return {
    async get(key) {
      const raw = values.get(key.name);

      return raw === undefined ? null : key.schema.safeParse(JSON.parse(raw));
    },
    async put(key, value) {
      values.set(key.name, JSON.stringify(key.schema.parse(value)));
      puts[key.name] = (puts[key.name] ?? 0) + 1;
    },
    putCounts: () => ({ ...puts }),
    resetPuts() {
      puts = {};
    },
  };
}
