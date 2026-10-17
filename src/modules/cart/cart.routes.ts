import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { CartService } from "./cart.service.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { authenticate } from "../../middleware/auth.middleware.js";

export const cartRoutes = new Hono();

// Require auth for all cart routes
cartRoutes.use("*", authenticate);

const addToCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
  selectedSize: z.string().optional(),
  selectedColor: z.string().optional(),
});

cartRoutes.get("/", async (c) => {
  const user = c.get("user");
  const items = await CartService.getUserCart(user.id);
  return sendSuccess(c, items, "Cart items fetched successfully");
});

cartRoutes.post("/", zValidator("json", addToCartSchema), async (c) => {
  const user = c.get("user");
  const data = c.req.valid("json");
  const item = await CartService.addToCart(user.id, data);
  return sendSuccess(c, item, "Item added to cart", 201);
});

cartRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const deleted = await CartService.removeFromCart(user.id, id);
  if (!deleted) return sendError(c, "Cart item not found", 404);
  return sendSuccess(c, deleted, "Item removed from cart");
});
