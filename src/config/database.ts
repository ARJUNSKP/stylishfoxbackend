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

    // Ensure all tables exist with IF NOT EXISTS
    await client`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'customer',
        phone_number TEXT,
        whatsapp_number TEXT,
        avatar_url TEXT,
        address JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(36) PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        image_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS colors (
        id VARCHAR(36) PRIMARY KEY,
        name TEXT NOT NULL,
        hex_code TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS sizes (
        id VARCHAR(36) PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(36) PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        tagline TEXT,
        description TEXT,
        rating NUMERIC(3, 1) NOT NULL DEFAULT 0.0,
        review_count INTEGER NOT NULL DEFAULT 0,
        features JSONB NOT NULL DEFAULT '[]'::jsonb,
        images JSONB NOT NULL DEFAULT '[]'::jsonb,
        category_id VARCHAR(36) REFERENCES categories(id) ON DELETE SET NULL,
        display_type INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS product_variants (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        color_id VARCHAR(36) REFERENCES colors(id) ON DELETE SET NULL,
        size_id VARCHAR(36) REFERENCES sizes(id) ON DELETE SET NULL,
        sku TEXT UNIQUE,
        price NUMERIC(10, 2),
        selling_price NUMERIC(10, 2),
        stock INTEGER NOT NULL DEFAULT 0,
        display_type INTEGER NOT NULL DEFAULT 0,
        images JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_published BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS cart_items (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1,
        selected_size TEXT,
        selected_color TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending',
        total_amount NUMERIC(10, 2) NOT NULL,
        items JSONB NOT NULL,
        shipping_address JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS carousels (
        id VARCHAR(36) PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        images TEXT[] NOT NULL DEFAULT '{}',
        is_active BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS sales_details (
        id VARCHAR(36) PRIMARY KEY,
        invoice_number VARCHAR(100) NOT NULL,
        user_id VARCHAR(36),
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255),
        customer_phone VARCHAR(50),
        customer_address TEXT,
        product_id VARCHAR(36),
        variant_id VARCHAR(36),
        product_name VARCHAR(255) NOT NULL,
        size VARCHAR(50),
        color VARCHAR(50),
        quantity INTEGER NOT NULL DEFAULT 1,
        price NUMERIC(10, 2) NOT NULL,
        selling_price NUMERIC(10, 2) NOT NULL,
        discount_amount NUMERIC(10, 2) DEFAULT 0.00,
        total_amount NUMERIC(10, 2) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'Cash on Delivery',
        payment_status VARCHAR(50) DEFAULT 'PAID',
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS store_settings (
        id VARCHAR(36) PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL DEFAULT 'general',
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    // Column migrations for existing tables
    await client`ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS selling_price NUMERIC(10, 2);`;
    await client`ALTER TABLE products ADD COLUMN IF NOT EXISTS display_type INTEGER NOT NULL DEFAULT 0;`;

    // Ensure default store_settings record exists
    await client`
      INSERT INTO store_settings (id, key, data)
      VALUES (
        gen_random_uuid(),
        'general',
        '{"whatsappNumber": "918086388058", "freeShippingThreshold": 2000, "shippingFee": 149}'::jsonb
      )
      ON CONFLICT (key) DO NOTHING;
    `;
    console.log("✅ All database tables verified and created if missing");
  } catch (err) {
    console.warn("Database pre-warming warning:", err);
  }
}
