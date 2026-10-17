import { pgTable, text, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";

export interface UserAddressItem {
  address: any;
  ActiveAddress: boolean;
}

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "customer"] }).default("customer").notNull(),
  phoneNumber: text("phone_number"),
  whatsappNumber: text("whatsapp_number"),
  avatarUrl: text("avatar_url"),
  address: jsonb("address").$type<UserAddressItem[]>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
