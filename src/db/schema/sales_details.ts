import { pgTable, text, timestamp, varchar, numeric, integer } from "drizzle-orm/pg-core";

export const salesDetails = pgTable("sales_details", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull(),
  userId: varchar("user_id", { length: 36 }),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  customerAddress: text("customer_address"),
  productId: varchar("product_id", { length: 36 }),
  variantId: varchar("variant_id", { length: 36 }),
  productName: varchar("product_name", { length: 255 }).notNull(),
  size: varchar("size", { length: 50 }),
  color: varchar("color", { length: 50 }),
  quantity: integer("quantity").default(1).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  sellingPrice: numeric("selling_price", { precision: 10, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default("0.00"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).default("Cash on Delivery"),
  paymentStatus: varchar("payment_status", { length: 50 }).default("PAID"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SalesDetail = typeof salesDetails.$inferSelect;
export type NewSalesDetail = typeof salesDetails.$inferInsert;
