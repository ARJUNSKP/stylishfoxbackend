import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "./env.js";
import * as schema from "../db/schema/index.js";

const isNeon = env.DATABASE_URL.includes("neon.tech");

const client = postgres(env.DATABASE_URL, {
  max: 20,
  idle_timeout: 300,
  connect_timeout: 15,
  prepare: false, // Recommended for Neon PgBouncer pooler
  ssl: isNeon || env.DATABASE_URL.includes("sslmode=require") ? "require" : undefined,
});

export const db = drizzle(client, { schema });
export type Database = typeof db;

export async function warmUpDatabase() {
  try {
    await client`SELECT 1`;
    await client`ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS selling_price NUMERIC(10, 2);`;
  } catch (err) {
    console.warn("Database pre-warming warning:", err);
  }
}
