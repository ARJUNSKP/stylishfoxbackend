import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const colors = pgTable("colors", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  hexCode: text("hex_code").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Color = typeof colors.$inferSelect;
export type NewColor = typeof colors.$inferInsert;
