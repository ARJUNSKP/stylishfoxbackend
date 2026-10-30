import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { AsyncLocalStorage } from "node:async_hooks";
import { env } from "./env.js";
import * as schema from "../db/schema/index.js";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

interface RequestDbContext {
  client: postgres.Sql;
  db: DrizzleDb;
}

export const dbContextStorage = new AsyncLocalStorage<RequestDbContext>();

export function createDatabaseConnection(customConnectionString?: string): RequestDbContext {
  // Support Hyperdrive binding or explicit env DATABASE_URL
  const connectionString =
    customConnectionString ||
    (process.env as any).HYPERDRIVE?.connectionString ||
    process.env.HYPERDRIVE_URL ||
    env.DATABASE_URL;

  const isHyperdrive = Boolean((process.env as any).HYPERDRIVE?.connectionString || process.env.HYPERDRIVE_URL);
  const isNeon = connectionString.includes("neon.tech");

  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: false,
    ssl: isHyperdrive ? false : (isNeon || connectionString.includes("sslmode=require") ? "require" : undefined),
    onnotice: () => {},
  });

  const db = drizzle(client, { schema });
  return { client, db };
}

// Fallback client for outside request context (e.g. migration, CLI script, local boot)
let globalFallbackContext: RequestDbContext | null = null;
function getFallbackContext(): RequestDbContext {
  if (!globalFallbackContext) {
    globalFallbackContext = createDatabaseConnection();
  }
  return globalFallbackContext;
}

export function getCurrentDbContext(): RequestDbContext {
  const store = dbContextStorage.getStore();
  if (store) return store;
  return getFallbackContext();
}

/**
 * Transparent proxy for Drizzle `db`.
 * Routes any method or property access dynamically to the current request's scoped DB instance.
 */
export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_, propKey: string | symbol) {
    const active = getCurrentDbContext().db as any;
    const target = active[propKey];
    if (typeof target === "function") {
      return target.bind(active);
    }
    return target;
  },
});

export type Database = DrizzleDb;

export async function warmUpDatabase() {
  try {
    const { client } = getCurrentDbContext();
    await client`SELECT 1`;
    await client`ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS selling_price NUMERIC(10, 2);`;
    await client`ALTER TABLE products ADD COLUMN IF NOT EXISTS display_type INTEGER NOT NULL DEFAULT 0;`;
    await client`
      CREATE TABLE IF NOT EXISTS store_settings (
        id VARCHAR(36) PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL DEFAULT 'general',
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
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
