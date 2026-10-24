import { pgTable, text, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";

export const storeSettings = pgTable("store_settings", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: varchar("key", { length: 100 }).notNull().unique().default("general"),
  data: jsonb("data").$type<{
    whatsappNumber: string;
    freeShippingThreshold: number;
    shippingFee?: number;
    supportEmail?: string;
    [key: string]: any;
  }>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type StoreSetting = typeof storeSettings.$inferSelect;
export type NewStoreSetting = typeof storeSettings.$inferInsert;
