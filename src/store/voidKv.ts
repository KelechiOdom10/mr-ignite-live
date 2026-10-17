import { kv } from "void/kv";

import type { KvStore } from "./kv";

export const voidKvStore: KvStore = {
  get: (key) => kv.get<unknown>(key),
  put: (key, value, options) => kv.put(key, value, options),
};
