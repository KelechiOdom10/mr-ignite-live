import { integer, sqliteTable, text } from "void/schema-d1";

export const favourite = sqliteTable("favourite", {
  uid: text("uid").primaryKey(),
  name: text("name").notNull(),
  addedAt: integer("added_at").notNull(),
});

export const playerCache = sqliteTable("player_cache", {
  key: text("key").primaryKey(),
  endpoint: text("endpoint").notNull(),
  status: text("status").notNull(),
  body: text("body"),
  fetchedAt: integer("fetched_at").notNull(),
  expiresAt: integer("expires_at"),
});

export const creditLedger = sqliteTable("credit_ledger", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  at: integer("at").notNull(),
  endpoint: text("endpoint").notNull(),
  requestKey: text("request_key").notNull(),
  expected: integer("expected").notNull(),
  cost: integer("cost"),
  balance: integer("balance"),
  httpStatus: integer("http_status"),
  settledAt: integer("settled_at"),
});
