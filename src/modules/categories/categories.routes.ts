import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { CategoriesService } from "./categories.service.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { authenticate, requireAdmin } from "../../middleware/auth.middleware.js";

export const categoriesRoutes = new Hono();

const categorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

categoriesRoutes.get("/", async (c) => {
  const items = await CategoriesService.getAll();
  return sendSuccess(c, items, "Categories fetched successfully");
});

categoriesRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await CategoriesService.getById(id);
  if (!item) return sendError(c, "Category not found", 404);
  return sendSuccess(c, item);
});

categoriesRoutes.post(
  "/",
  authenticate,
  requireAdmin,
  zValidator("json", categorySchema),
  async (c) => {
    try {
      const data = c.req.valid("json");
      const created = await CategoriesService.create(data);
      return sendSuccess(c, created, "Category created successfully", 201);
    } catch (error: any) {
      return sendError(c, error.message || "Failed to create category", 400);
    }
  }
);
