import { pgTable, text, timestamp, varchar, numeric, integer, jsonb } from "drizzle-orm/pg-core";
import { categories } from "./categories";

export const products = pgTable("products", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  tagline: text("tagline"),
  description: text("description"),
  rating: numeric("rating", { precision: 3, scale: 1 }).default("0.0").notNull(),
  reviewCount: integer("review_count").default(0).notNull(),
  features: jsonb("features").$type<string[]>().default([]).notNull(),
  images: jsonb("images").$type<string[]>().default([]).notNull(),
  categoryId: varchar("category_id", { length: 36 }).references(() => categories.id, { onDelete: "set null" }),
  displayType: integer("display_type").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
