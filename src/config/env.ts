import { z } from "zod";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".dev.vars" });

const envSchema = z.object({
  PORT: z.string().default("8000").transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CLIENT_URL: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().default("postgresql://neondb_owner:npg_X2b4nRjYWkMC@ep-sparkling-water-b4owxkx4-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"),
  JWT_SECRET: z.string().default("stylefox-default-jwt-secret-key-32chars"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default("stylefox-assets"),
  R2_PUBLIC_URL: z.string().default("https://assets.stylefox.com"),
});

export const env = envSchema.parse(process.env);
