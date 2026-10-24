import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { settingsService } from "./settings.service.js";
import { sendSuccess } from "../../utils/response.js";
import { authenticate, requireAdmin } from "../../middleware/auth.middleware.js";

export const settingsRoutes = new Hono();

const updateSettingsSchema = z.object({
  whatsappNumber: z.string().min(5, "WhatsApp number is required"),
  freeShippingThreshold: z.coerce.number().min(0, "Free shipping threshold must be 0 or greater"),
  shippingFee: z.coerce.number().min(0).optional(),
  supportEmail: z.string().email().optional().or(z.literal("")),
});

// GET /api/v1/settings - Public route so Header, Cart, etc. can fetch settings
settingsRoutes.get("/", async (c) => {
  const settings = await settingsService.getSettings("general");
  return sendSuccess(c, settings);
});

// PUT /api/v1/settings - Admin only route to update store settings
settingsRoutes.put(
  "/",
  authenticate,
  requireAdmin,
  zValidator("json", updateSettingsSchema),
  async (c) => {
    const data = c.req.valid("json");
    const updated = await settingsService.updateSettings(data, "general");
    return sendSuccess(c, updated, "Settings updated successfully");
  }
);
