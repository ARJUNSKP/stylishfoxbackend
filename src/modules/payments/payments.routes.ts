import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { PaymentsService } from "./payments.service.js";
import { sendSuccess } from "../../utils/response.js";
import { authenticate } from "../../middleware/auth.middleware.js";

export const paymentsRoutes = new Hono();

paymentsRoutes.use("*", authenticate);

const createIntentSchema = z.object({
  orderId: z.string(),
  amount: z.number().positive(),
});

paymentsRoutes.post("/create-intent", zValidator("json", createIntentSchema), async (c) => {
  const { orderId, amount } = c.req.valid("json");
  const intent = await PaymentsService.createPaymentIntent(orderId, amount);
  return sendSuccess(c, intent, "Payment intent created");
});
