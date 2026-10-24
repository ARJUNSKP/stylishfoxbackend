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
  onnotice: () => {}, // Suppress informational NOTICE messages (e.g., column already exists, skipping)
});

export const db = drizzle(client, { schema });
export type Database = typeof db;

export async function warmUpDatabase() {
  try {
    await client`SELECT 1`;
    await client`ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS selling_price NUMERIC(10, 2);`;
    await client`
      CREATE TABLE IF NOT EXISTS store_settings (
        id VARCHAR(36) PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL DEFAULT 'general',
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    // Seed default settings row if not present
    await client`
      INSERT INTO store_settings (id, key, data)
      VALUES (
        gen_random_uuid(),
        'general',
        '{"whatsappNumber": "918086388058", "freeShippingThreshold": 2000, "shippingFee": 149}'::jsonb
      )
      ON CONFLICT (key) DO NOTHING;
    `;
  } catch (err) {
    console.warn("Database pre-warming warning:", err);
  }
}
