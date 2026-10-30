import { pgTable, text, timestamp, varchar, numeric, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { products } from "./products";
import { colors } from "./colors";
import { sizes } from "./sizes";

export const productVariants = pgTable("product_variants", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: varchar("product_id", { length: 36 })
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  colorId: varchar("color_id", { length: 36 })
    .references(() => colors.id, { onDelete: "set null" }),
  sizeId: varchar("size_id", { length: 36 })
    .references(() => sizes.id, { onDelete: "set null" }),
  sku: text("sku").unique(),
  price: numeric("price", { precision: 10, scale: 2 }),
  sellingPrice: numeric("selling_price", { precision: 10, scale: 2 }),
  stock: integer("stock").default(0).notNull(),
  displayType: integer("display_type").default(0).notNull(),
  images: jsonb("images").$type<string[]>().default([]).notNull(),
  isPublished: boolean("is_published").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
