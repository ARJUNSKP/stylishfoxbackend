import type { Context, Next } from "hono";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { sendError } from "../utils/response.js";
import type { UserPayload } from "../types/index.js";

declare module "hono" {
  interface ContextVariableMap {
    user: UserPayload;
  }
}

export const authenticate = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(c, "Authorization token is missing or malformed", 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;
    c.set("user", decoded);
    await next();
  } catch {
    return sendError(c, "Invalid or expired token", 401);
  }
};

export const requireAdmin = async (c: Context, next: Next) => {
  const user = c.get("user");
  if (!user || user.role !== "admin") {
    return sendError(c, "Forbidden: Admin access required", 403);
  }
  await next();
};
