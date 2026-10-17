import { pgTable, text, timestamp, varchar, numeric, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";

export const orders = pgTable("orders", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["pending", "processing", "shipped", "delivered", "cancelled"] }).default("pending").notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  items: jsonb("items").$type<{
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    size?: string;
    color?: string;
    image?: string;
  }[]>().notNull(),
  shippingAddress: jsonb("shipping_address").$type<{
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }>().notNull(),
  paymentStatus: text("payment_status", { enum: ["unpaid", "paid", "refunded"] }).default("unpaid").notNull(),
  paymentMethod: text("payment_method").default("cod").notNull(),
  paymentId: text("payment_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
