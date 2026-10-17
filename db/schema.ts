import { integer, sqliteTable, text } from "void/schema-d1";

export const favourite = sqliteTable("favourite", {
  uid: text("uid").primaryKey(),
  name: text("name").notNull(),
  addedAt: integer("added_at").notNull(),
});
