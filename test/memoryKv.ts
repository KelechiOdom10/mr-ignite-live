import type { KvStore } from "@/store/kv";

export interface MemoryKvStore extends KvStore {
  /** Puts per key since creation or the last `resetPuts()`. */
  putCounts(): Record<string, number>;
  resetPuts(): void;
}

// Values round-trip through JSON, as void/kv stores them, so a value KV can't hold fails here too.
export function memoryKvStore(initial: Record<string, unknown> = {}): MemoryKvStore {
  const values = new Map<string, string>(
    Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]),
  );
  let puts: Record<string, number> = {};
  return {
    async get(key) {
      const raw = values.get(key);
      return raw === undefined ? null : JSON.parse(raw);
    },
    async put(key, value) {
      values.set(key, JSON.stringify(value));
      puts[key] = (puts[key] ?? 0) + 1;
    },
    putCounts: () => ({ ...puts }),
    resetPuts() {
      puts = {};
    },
  };
}
