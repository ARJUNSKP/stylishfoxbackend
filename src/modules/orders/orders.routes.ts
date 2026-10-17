import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { OrdersService } from "./orders.service.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { authenticate, requireAdmin } from "../../middleware/auth.middleware.js";

export const ordersRoutes = new Hono();

ordersRoutes.use("*", authenticate);

const createOrderSchema = z.object({
  totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  items: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      price: z.number(),
      quantity: z.number(),
      size: z.string().optional(),
      color: z.string().optional(),
      image: z.string().optional(),
    })
  ),
  shippingAddress: z.object({
    fullName: z.string(),
    phone: z.string(),
    addressLine1: z.string(),
    addressLine2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string(),
  }),
  paymentMethod: z.string().default("cod"),
});

// GET /api/v1/orders - User's orders
ordersRoutes.get("/", async (c) => {
  const user = c.get("user");
  const orders = await OrdersService.getUserOrders(user.id);
  return sendSuccess(c, orders, "Orders fetched successfully");
});

// GET /api/v1/orders/admin/all - All orders (Admin only)
ordersRoutes.get("/admin/all", requireAdmin, async (c) => {
  const all = await OrdersService.getAllOrders();
  return sendSuccess(c, all, "All orders fetched successfully");
});

// GET /api/v1/orders/:id - Single order details
ordersRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const order = await OrdersService.getById(id);
  if (!order) return sendError(c, "Order not found", 404);
  return sendSuccess(c, order);
});

// POST /api/v1/orders - Place order
ordersRoutes.post("/", zValidator("json", createOrderSchema), async (c) => {
  const user = c.get("user");
  const data = c.req.valid("json");
  const order = await OrdersService.createOrder({ ...data, userId: user.id });
  return sendSuccess(c, order, "Order placed successfully", 201);
});
