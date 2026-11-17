import { z } from "zod";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".dev.vars" });

const envSchema = z.object({
  PORT: z
    .string()
    .default("8000")
    .transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CLIENT_URL: z.string().default("https://stylishfox.in"),
  DATABASE_URL: z
    .string()
    .default(
      "postgresql://stylishfox_hyperdrive:npg_n9dJM1tlokRA@ep-lucky-scene-b47dnrev.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    ),
  JWT_SECRET: z.string().default("super_secret_stylefox_jwt_token_change_in_production"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);
