import type { z } from "zod";

export interface KvPutOptions {
  ttl?: number;
}

export interface KvKey<T> {
  name: string;
  schema: z.ZodType<T>;
}

export function kvKey<T>(name: string, schema: z.ZodType<T>): KvKey<T> {
  return { name, schema };
}

/** The slice of KV the store uses. Writes are validated and reads parsed against the key's schema. */
export interface KvStore {
  /** null for a missing key; a failed parse for a value written under an older schema. */
  get<T>(key: KvKey<T>): Promise<z.ZodSafeParseResult<T> | null>;
  put<T>(key: KvKey<T>, value: T, options?: KvPutOptions): Promise<void>;
}
