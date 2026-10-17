import { pgTable, text, timestamp, varchar, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { products } from "./products";

export const cartItems = pgTable("cart_items", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: varchar("product_id", { length: 36 }).notNull().references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").default(1).notNull(),
  selectedSize: text("selected_size"),
  selectedColor: text("selected_color"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;
