import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { OrdersService } from "./orders.service.js";
import { SalesService } from "./sales.service.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { authenticate, requireAdmin } from "../../middleware/auth.middleware.js";

export const ordersRoutes = new Hono();

ordersRoutes.use("*", authenticate);

const invoiceSaleSchema = z.object({
  invoiceNumber: z.string(),
  userId: z.string().optional().nullable(),
  customerName: z.string(),
  customerEmail: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerAddress: z.string().optional().nullable(),
  paymentMethod: z.string().optional(),
  paymentStatus: z.string().optional(),
  notes: z.string().optional().nullable(),
  items: z.array(
    z.object({
      productId: z.string().optional().nullable(),
      variantId: z.string().optional().nullable(),
      productName: z.string(),
      size: z.string().optional().nullable(),
      color: z.string().optional().nullable(),
      quantity: z.number().min(1),
      originalPrice: z.number(),
      sellingPrice: z.number(),
      discountAmount: z.number().optional(),
      totalAmount: z.number(),
    })
  ).min(1, "At least one item is required"),
});

// GET /api/v1/orders/admin/next-invoice-number - Get next sequential invoice number
ordersRoutes.get("/admin/next-invoice-number", requireAdmin, async (c) => {
  try {
    const nextInvoiceNumber = await SalesService.getNextInvoiceNumber();
    return sendSuccess(c, { nextInvoiceNumber }, "Next invoice number generated", 200);
  } catch (err: any) {
    return sendError(c, err.message || "Failed to get next invoice number", 500);
  }
});

// POST /api/v1/orders/admin/reset-invoice-counter - Reset invoice counter to SF-INV-00001
ordersRoutes.post("/admin/reset-invoice-counter", requireAdmin, async (c) => {
  try {
    const nextInvoiceNumber = await SalesService.resetInvoiceCounter();
    return sendSuccess(c, { nextInvoiceNumber }, "Invoice counter reset to SF-INV-00001", 200);
  } catch (err: any) {
    return sendError(c, err.message || "Failed to reset invoice counter", 500);
  }
});

// POST /api/v1/orders/admin/invoice-sale - Record invoice sale & reduce product variant stock
ordersRoutes.post("/admin/invoice-sale", requireAdmin, zValidator("json", invoiceSaleSchema), async (c) => {
  try {
    const data = c.req.valid("json");
    const result = await SalesService.recordInvoiceSale(data as any);
    return sendSuccess(c, result, "Invoice sale recorded and stock updated successfully", 201);
  } catch (err: any) {
    return sendError(c, err.message || "Failed to record invoice sale", 400);
  }
});

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
