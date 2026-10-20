import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { db } from "../../config/database.js";
import { colors, productVariants, products } from "../../db/schema/index.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { authenticate, requireAdmin } from "../../middleware/auth.middleware.js";

export const colorsRoutes = new Hono();

const colorSchema = z.object({
  name: z.string().min(1),
  hexCode: z.string().min(2),
});

colorsRoutes.get("/", async (c) => {
  try {
    const items = await db.select().from(colors);
    return sendSuccess(c, items, "Colors fetched successfully");
  } catch (error: any) {
    return sendError(c, error.message || "Failed to fetch colors", 500);
  }
});

colorsRoutes.post(
  "/",
  authenticate,
  requireAdmin,
  zValidator("json", colorSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");
      const [created] = await db.insert(colors).values(data).returning();
      return sendSuccess(c, created, "Color created successfully", 201);
    } catch (error: any) {
      return sendError(c, error.message || "Failed to create color", 400);
    }
  }
);

colorsRoutes.delete("/:id", authenticate, requireAdmin, async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) {
      return sendError(c, "Color ID is required", 400);
    }

    // Check if any product variant is using this color
    const linkedVariants = await db
      .select({
        id: productVariants.id,
        sku: productVariants.sku,
        productName: products.name,
      })
      .from(productVariants)
      .leftJoin(products, eq(productVariants.productId, products.id))
      .where(eq(productVariants.colorId, id))
      .limit(5);

    if (linkedVariants.length > 0) {
      const sample = linkedVariants[0];
      const productInfo = sample.productName
        ? `product "${sample.productName}"`
        : `SKU "${sample.sku || sample.id}"`;
      return sendError(
        c,
        `Cannot delete color: It is currently used in ${productInfo}. Please reassign or delete the product variants first.`,
        400
      );
    }

    const [deleted] = await db.delete(colors).where(eq(colors.id, id)).returning();
    if (!deleted) {
      return sendError(c, "Color not found", 404);
    }
    return sendSuccess(c, deleted, "Color deleted successfully");
  } catch (error: any) {
    return sendError(c, error.message || "Failed to delete color", 400);
  }
});
