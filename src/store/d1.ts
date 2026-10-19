import { creditLedger, favourite, playerCache } from "@schema";
import { db, desc, eq, sql } from "void/db";
import { z } from "zod";

import { FavouriteSchema } from "@/domain/player";

import type { FavouriteStore } from "./favourites";
import type { CachedResponse, CreditLedger, PlayerCache } from "./playerData";

export const d1FavouriteStore: FavouriteStore = {
  async list() {
    const rows = await db.select().from(favourite).orderBy(desc(favourite.addedAt));

    return z.array(FavouriteSchema).parse(rows);
  },
  async save(f) {
    await db
      .insert(favourite)
      .values(f)
      .onConflictDoUpdate({ target: favourite.uid, set: { name: f.name } });
  },
  async remove(uid) {
    await db.delete(favourite).where(eq(favourite.uid, uid));
  },
};

const CacheRowSchema = z.object({
  status: z.enum(["ok", "history_private", "career_private", "not_found"]),
  body: z
    .string()
    .nullable()
    .transform((b): unknown => (b === null ? null : JSON.parse(b))),
  fetchedAt: z.number().int(),
  expiresAt: z.number().int().nullable(),
});

export const d1PlayerCache: PlayerCache = {
  async get(key) {
    const [row] = await db.select().from(playerCache).where(eq(playerCache.key, key)).limit(1);

    return row ? CacheRowSchema.parse(row) : null;
  },
  async put(key, endpoint, entry: CachedResponse) {
    const values = {
      endpoint,
      status: entry.status,
      body: entry.body === null ? null : JSON.stringify(entry.body),
      fetchedAt: entry.fetchedAt,
      expiresAt: entry.expiresAt,
    };

    await db
      .insert(playerCache)
      .values({ key, ...values })
      .onConflictDoUpdate({ target: playerCache.key, set: values });
  },
};

const IdRowsSchema = z.array(z.object({ id: z.number().int() }));

const SummaryRowsSchema = z.array(
  z.object({ spent: z.number(), pending: z.number(), balance: z.number().nullable() }),
);

export const d1CreditLedger: CreditLedger = {
  // One statement, so the budget check and the pending row can't interleave with another request's.
  async reserve(r) {
    const rows = await db.all(sql`
      INSERT INTO credit_ledger (at, endpoint, request_key, expected)
      SELECT ${r.at}, ${r.endpoint}, ${r.key}, ${r.expected}
      WHERE (
        SELECT COALESCE(SUM(CASE WHEN settled_at IS NULL THEN expected ELSE cost END), 0)
        FROM credit_ledger
      ) + ${r.expected} <= ${r.budget}
      RETURNING id`);

    const [row] = IdRowsSchema.parse(rows);

    return row?.id ?? null;
  },
  async settle(id, s) {
    await db
      .update(creditLedger)
      .set({ cost: s.cost, balance: s.balance, httpStatus: s.httpStatus, settledAt: Date.now() })
      .where(eq(creditLedger.id, id));
  },
  async summary() {
    const rows = await db.all(sql`
      SELECT
        COALESCE(SUM(CASE WHEN settled_at IS NOT NULL THEN cost ELSE 0 END), 0) AS spent,
        COALESCE(SUM(CASE WHEN settled_at IS NULL THEN expected ELSE 0 END), 0) AS pending,
        (SELECT balance FROM credit_ledger WHERE balance IS NOT NULL ORDER BY id DESC LIMIT 1) AS balance
      FROM credit_ledger`);

    const [row] = SummaryRowsSchema.parse(rows);

    return row ?? { spent: 0, pending: 0, balance: null };
  },
};
