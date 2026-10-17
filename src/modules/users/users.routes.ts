import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { UsersService } from "./users.service.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { authenticate } from "../../middleware/auth.middleware.js";

export const usersRoutes = new Hono();

usersRoutes.use("*", authenticate);

const addressItemSchema = z.object({
  address: z.union([z.string(), z.record(z.any())]),
  ActiveAddress: z.boolean().default(false),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phoneNumber: z.string().optional(),
  whatsappNumber: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  address: z.array(addressItemSchema).optional(),
});

const addAddressSchema = z.object({
  address: z.union([z.string(), z.record(z.any())]),
  ActiveAddress: z.boolean().optional().default(false),
});

const setActiveSchema = z.object({
  index: z.number().int().nonnegative(),
});

// GET /api/v1/users/profile
usersRoutes.get("/profile", async (c) => {
  const user = c.get("user");
  const profile = await UsersService.getProfile(user.id);
  if (!profile) return sendError(c, "User not found", 404);
  return sendSuccess(c, profile);
});

// PATCH /api/v1/users/profile (can update name, phone, avatar, or entire address array)
usersRoutes.patch("/profile", zValidator("json", updateProfileSchema), async (c) => {
  const user = c.get("user");
  const data = c.req.valid("json");
  const updated = await UsersService.updateProfile(user.id, data);
  return sendSuccess(c, updated, "Profile updated successfully");
});

// POST /api/v1/users/address (append a single address: { address, ActiveAddress })
usersRoutes.post("/address", zValidator("json", addAddressSchema), async (c) => {
  try {
    const user = c.get("user");
    const data = c.req.valid("json");
    const updated = await UsersService.addAddress(user.id, data);
    return sendSuccess(c, updated, "Address added successfully", 201);
  } catch (error: any) {
    return sendError(c, error.message || "Failed to add address", 400);
  }
});

// PATCH /api/v1/users/address/active (set active address by index)
usersRoutes.patch("/address/active", zValidator("json", setActiveSchema), async (c) => {
  try {
    const user = c.get("user");
    const { index } = c.req.valid("json");
    const updated = await UsersService.setActiveAddress(user.id, index);
    return sendSuccess(c, updated, "Active address updated successfully");
  } catch (error: any) {
    return sendError(c, error.message || "Failed to set active address", 400);
  }
});
