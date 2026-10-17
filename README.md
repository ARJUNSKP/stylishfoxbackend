# StyleFox Backend API (`stylishfoxbackend`)

High-performance E-Commerce Backend REST API built with **Hono**, **Drizzle ORM**, **PostgreSQL** (Neon / Supabase), and **Cloudflare R2** object storage.

---

## ⚡ Tech Stack

- **Framework**: [Hono v4](https://hono.dev/) on Node.js
- **Database & ORM**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Object Storage**: [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) (via AWS S3 SDK)
- **Validation**: [Zod](https://zod.dev/) & `@hono/zod-validator`
- **Authentication**: JWT & `bcryptjs`
- **Language & Runtime**: TypeScript, `tsx`

---

## 🚀 Features

- **Product Management**: List, filter, get by slug/ID, and admin CRUD.
- **Automatic R2 Image Upload**: Direct `multipart/form-data` image upload to Cloudflare R2 on product creation, updates, and dedicated image upload routes.
- **R2 Storage Purge**: Automatically deletes objects from Cloudflare R2 when products or images are removed.
- **Variants & Inventory**: Supports color, size, SKU, stock, and variant-specific pricing.
- **Category Hierarchy**: Category filtering and slug lookup.
- **User Profiles & Addresses**: Multi-address management with active address toggling.
- **Cart & Orders**: Cart synchronization and full order tracking with payment intents.
- **Authentication**: Secure JWT-based authentication with customer & admin roles.

---

## 📁 Project Structure

```text
StyleFoxBackend/
├── src/
│   ├── app.ts                  # Hono application setup & route mounting
│   ├── index.ts                # Server entry point (@hono/node-server)
│   ├── config/
│   │   ├── database.ts         # PostgreSQL database connection (Drizzle)
│   │   └── env.ts              # Zod-validated environment variables
│   ├── db/
│   │   ├── schema/             # Drizzle ORM tables (users, products, variants, etc.)
│   │   └── seed.ts             # Database seeder script
│   ├── middleware/             # Auth, admin guard, error handler, logger
│   ├── modules/
│   │   ├── auth/               # Register, login, me
│   │   ├── cart/               # Cart CRUD
│   │   ├── categories/         # Category CRUD
│   │   ├── orders/             # Order management
│   │   ├── payments/           # Payment intents
│   │   ├── products/           # Products, variants & R2 image uploads
│   │   ├── uploads/            # Cloudflare R2 pre-signed and direct uploads
│   │   └── users/              # Profile & address book
│   ├── services/
│   │   └── r2.service.ts       # Cloudflare R2 S3 client service
│   └── utils/
│       └── response.ts         # Standardized JSON response utilities
├── API_DOCUMENTATION.md        # Complete REST API reference
├── StyleFox_Postman_Collection.json # Postman collection
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

---

## 🛠️ Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.dev.vars.example` to `.env`:
```bash
cp .dev.vars.example .env
```

Fill in your database URL and Cloudflare R2 credentials in `.env`:
```env
PORT=8000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

DATABASE_URL=postgresql://user:password@host/db?sslmode=require

JWT_SECRET=super_secret_stylefox_jwt_token_change_in_production
JWT_EXPIRES_IN=7d

# Cloudflare R2 Object Storage
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=stylefox-assets
R2_PUBLIC_URL=https://assets.stylefox.com
```

### 3. Run Database Migrations / Seed
```bash
# Push schema changes to database
npm run db:push

# (Optional) Seed initial categories, colors, sizes, and admin user
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```
The server will start at `http://localhost:8000`.

---

## 📖 API Documentation

Detailed documentation for every endpoint, request payload, and response format is available in:
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- [Postman Collection](./StyleFox_Postman_Collection.json)
