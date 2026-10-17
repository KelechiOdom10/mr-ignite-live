export interface KvPutOptions {
  ttl?: number;
}

/** The slice of KV the store uses. Values come back untyped; callers parse them. */
export interface KvStore {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown, options?: KvPutOptions): Promise<void>;
}
