import { kv } from "void/kv";

import type { KvStore } from "./kv";

export const voidKvStore: KvStore = {
  async get(key) {
    const raw = await kv.get(key.name);

    return raw === null ? null : key.schema.safeParse(raw);
  },
  put: (key, value, options) => kv.put(key.name, key.schema.parse(value), options),
};
