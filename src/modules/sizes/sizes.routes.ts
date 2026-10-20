import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { asc, eq } from "drizzle-orm";
import { db } from "../../config/database.js";
import { sizes, productVariants, products } from "../../db/schema/index.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { authenticate, requireAdmin } from "../../middleware/auth.middleware.js";

export const sizesRoutes = new Hono();

const sizeSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  sortOrder: z.number().int().optional().default(0),
});

sizesRoutes.get("/", async (c) => {
  try {
    const items = await db.select().from(sizes).orderBy(asc(sizes.sortOrder));
    return sendSuccess(c, items, "Sizes fetched successfully");
  } catch (error: any) {
    return sendError(c, error.message || "Failed to fetch sizes", 500);
  }
});

sizesRoutes.post(
  "/",
  authenticate,
  requireAdmin,
  zValidator("json", sizeSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");
      const [created] = await db.insert(sizes).values(data).returning();
      return sendSuccess(c, created, "Size created successfully", 201);
    } catch (error: any) {
      return sendError(c, error.message || "Failed to create size", 400);
    }
  }
);

sizesRoutes.delete("/:id", authenticate, requireAdmin, async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) {
      return sendError(c, "Size ID is required", 400);
    }

    // Check if any product variant is using this size
    const linkedVariants = await db
      .select({
        id: productVariants.id,
        sku: productVariants.sku,
        productName: products.name,
      })
      .from(productVariants)
      .leftJoin(products, eq(productVariants.productId, products.id))
      .where(eq(productVariants.sizeId, id))
      .limit(5);

    if (linkedVariants.length > 0) {
      const sample = linkedVariants[0];
      const productInfo = sample.productName
        ? `product "${sample.productName}"`
        : `SKU "${sample.sku || sample.id}"`;
      return sendError(
        c,
        `Cannot delete size: It is currently used in ${productInfo}. Please reassign or delete the product variants first.`,
        400
      );
    }

    const [deleted] = await db.delete(sizes).where(eq(sizes.id, id)).returning();
    if (!deleted) {
      return sendError(c, "Size not found", 404);
    }
    return sendSuccess(c, deleted, "Size deleted successfully");
  } catch (error: any) {
    return sendError(c, error.message || "Failed to delete size", 400);
  }
});
