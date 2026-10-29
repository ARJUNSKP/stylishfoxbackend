import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { UsersService } from "./users.service.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { authenticate, requireAdmin } from "../../middleware/auth.middleware.js";

export const usersRoutes = new Hono();

usersRoutes.use("*", authenticate);

// GET /api/v1/users/admin/all - Get all users (Admin only)
usersRoutes.get("/admin/all", requireAdmin, async (c) => {
  const all = await UsersService.getAllUsers();
  return sendSuccess(c, all, "Users fetched successfully");
});

const addressItemSchema = z.union([
  z.object({
    address: z.union([z.string(), z.record(z.any())]),
    ActiveAddress: z.boolean().optional().default(false),
  }),
  z.record(z.any()),
]);

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phoneNumber: z.string().optional().nullable(),
  whatsappNumber: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  address: z.array(z.any()).optional(),
});

const addAddressSchema = z.union([
  z.object({
    address: z.union([z.string(), z.record(z.any())]),
    ActiveAddress: z.boolean().optional().default(false),
  }),
  z.record(z.any()),
]);

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

// PATCH /api/v1/users/profile (can update name, phone, whatsapp, avatar, or entire address array)
usersRoutes.patch("/profile", zValidator("json", updateProfileSchema), async (c) => {
  const user = c.get("user");
  const data = c.req.valid("json");
  const updated = await UsersService.updateProfile(user.id, data as any);
  return sendSuccess(c, updated, "Profile updated successfully");
});

// POST /api/v1/users/address (append a single address: { address, ActiveAddress } or raw address object)
usersRoutes.post("/address", zValidator("json", addAddressSchema), async (c) => {
  try {
    const user = c.get("user");
    const rawData = c.req.valid("json") as any;
    
    // Normalize address structure if raw fields provided
    const payload = rawData.address
      ? rawData
      : {
          address: {
            id: rawData.id,
            name: rawData.name,
            phone: rawData.phone,
            street: rawData.street,
            city: rawData.city,
            state: rawData.state,
            pincode: rawData.pincode,
            tag: rawData.tag || "Home",
            isDefault: rawData.isDefault ?? rawData.ActiveAddress ?? false,
          },
          ActiveAddress: rawData.ActiveAddress ?? rawData.isDefault ?? false,
        };

    const updated = await UsersService.addAddress(user.id, payload);
    return sendSuccess(c, updated, "Address added successfully", 201);
  } catch (error: any) {
    return sendError(c, error.message || "Failed to add address", 400);
  }
});

// PUT /api/v1/users/address/:index (update existing address by index)
usersRoutes.put("/address/:index", async (c) => {
  try {
    const user = c.get("user");
    const index = parseInt(c.req.param("index"), 10);
    if (isNaN(index)) return sendError(c, "Invalid address index", 400);

    const rawData = await c.req.json().catch(() => ({}));
    const addressData = rawData.address || rawData;

    const updated = await UsersService.updateAddress(user.id, index, addressData);
    return sendSuccess(c, updated, "Address updated successfully");
  } catch (error: any) {
    return sendError(c, error.message || "Failed to update address", 400);
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

// DELETE /api/v1/users/address/:index (delete address by index)
usersRoutes.delete("/address/:index", async (c) => {
  try {
    const user = c.get("user");
    const index = parseInt(c.req.param("index"), 10);
    if (isNaN(index)) return sendError(c, "Invalid address index", 400);
    const updated = await UsersService.deleteAddress(user.id, index);
    return sendSuccess(c, updated, "Address deleted successfully");
  } catch (error: any) {
    return sendError(c, error.message || "Failed to delete address", 400);
  }
});
