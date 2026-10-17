import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { AuthService } from "./auth.service.js";
import { registerSchema, loginSchema } from "./auth.validation.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { authenticate } from "../../middleware/auth.middleware.js";

export const authRoutes = new Hono();

// POST /api/v1/auth/register
authRoutes.post("/register", zValidator("json", registerSchema), async (c) => {
  try {
    const body = c.req.valid("json");
    const result = await AuthService.register(body);
    return sendSuccess(c, result, "User registered successfully", 201);
  } catch (error: any) {
    return sendError(c, error.message || "Registration failed", 400);
  }
});

// POST /api/v1/auth/login
authRoutes.post("/login", zValidator("json", loginSchema), async (c) => {
  try {
    const body = c.req.valid("json");
    const result = await AuthService.login(body);
    return sendSuccess(c, result, "Logged in successfully", 200);
  } catch (error: any) {
    return sendError(c, error.message || "Login failed", 401);
  }
});

// GET /api/v1/auth/me
authRoutes.get("/me", authenticate, async (c) => {
  const user = c.get("user");
  return sendSuccess(c, { user }, "User profile fetched successfully");
});
