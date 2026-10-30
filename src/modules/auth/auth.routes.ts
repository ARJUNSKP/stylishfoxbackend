import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { AuthService } from "./auth.service.js";
import {
  registerSchema,
  loginSchema,
  checkEmailSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from "./auth.validation.js";
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

// POST /api/v1/auth/refresh (exchange refresh token for fresh access token)
authRoutes.post("/refresh", zValidator("json", refreshTokenSchema), async (c) => {
  try {
    const { refreshToken } = c.req.valid("json");
    const result = await AuthService.refreshAccessToken(refreshToken);
    return sendSuccess(c, result, "Access token refreshed successfully", 200);
  } catch (error: any) {
    return sendError(c, error.message || "Invalid or expired refresh token", 401);
  }
});

// POST /api/v1/auth/check-email (check if email is registered)
authRoutes.post("/check-email", zValidator("json", checkEmailSchema), async (c) => {
  try {
    const { email } = c.req.valid("json");
    const result = await AuthService.checkEmailExists(email);
    return sendSuccess(c, result, result.exists ? "Email is registered" : "Email is not registered", 200);
  } catch (error: any) {
    return sendError(c, error.message || "Failed to verify email", 400);
  }
});

// POST /api/v1/auth/reset-password (update password after email verification)
authRoutes.post("/reset-password", zValidator("json", resetPasswordSchema), async (c) => {
  try {
    const { email, newPassword } = c.req.valid("json");
    const result = await AuthService.resetPassword(email, newPassword);
    return sendSuccess(c, result, "Password updated successfully", 200);
  } catch (error: any) {
    return sendError(c, error.message || "Failed to reset password", 400);
  }
});

// GET /api/v1/auth/me
authRoutes.get("/me", authenticate, async (c) => {
  const user = c.get("user");
  return sendSuccess(c, { user }, "User profile fetched successfully");
});
