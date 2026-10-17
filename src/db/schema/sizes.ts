import { pgTable, text, timestamp, varchar, integer } from "drizzle-orm/pg-core";

export const sizes = pgTable("sizes", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Size = typeof sizes.$inferSelect;
export type NewSize = typeof sizes.$inferInsert;
