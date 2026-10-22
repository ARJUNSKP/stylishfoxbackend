import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { CarouselsService, ImageFileInput } from "./carousels.service.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { authenticate, requireAdmin } from "../../middleware/auth.middleware.js";

export const carouselsRoutes = new Hono();

// GET /api/v1/carousels - Get all carousels (Admin or customer)
carouselsRoutes.get("/", async (c) => {
  try {
    const items = await CarouselsService.getAll();
    return sendSuccess(c, items, "Carousels retrieved successfully");
  } catch (error: any) {
    return sendError(c, error.message || "Failed to fetch carousels", 500);
  }
});

// GET /api/v1/carousels/active - Public customer endpoint for currently active banner carousel
carouselsRoutes.get("/active", async (c) => {
  try {
    const active = await CarouselsService.getActive();
    return sendSuccess(c, active, "Active carousel retrieved successfully");
  } catch (error: any) {
    return sendError(c, error.message || "Failed to fetch active carousel", 500);
  }
});

// POST /api/v1/carousels - Create new carousel with images (Supports multipart/form-data & json)
carouselsRoutes.post("/", authenticate, requireAdmin, async (c) => {
  try {
    const contentType = c.req.header("content-type") || "";
    let title = "";
    let description = "";
    let isActive = false;
    let images: string[] = [];
    const imageFiles: ImageFileInput[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await c.req.formData();
      title = (formData.get("title") as string) || "";
      description = (formData.get("description") as string) || "";
      isActive = formData.get("isActive") === "true";

      const rawImages = formData.getAll("images") as string[];
      for (const img of rawImages) {
        if (typeof img === "string" && img.trim()) {
          try {
            if (img.startsWith("[") && img.endsWith("]")) {
              const parsed = JSON.parse(img);
              if (Array.isArray(parsed)) images.push(...parsed);
            } else {
              images.push(img);
            }
          } catch {
            images.push(img);
          }
        }
      }

      // Collect multiple file candidates
      const fileCandidates = [
        ...formData.getAll("files"),
        ...formData.getAll("file"),
        ...formData.getAll("images"),
        ...formData.getAll("image"),
      ];

      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

      for (const item of fileCandidates) {
        if (item instanceof File && item.size > 0) {
          if (item.size > MAX_FILE_SIZE) {
            return sendError(
              c,
              `File "${item.name}" exceeds the maximum allowed size of 5 MB`,
              400
            );
          }
          if (item.type && !item.type.startsWith("image/")) {
            return sendError(
              c,
              `File "${item.name}" is not a valid image format`,
              400
            );
          }
          const buffer = Buffer.from(await item.arrayBuffer());
          imageFiles.push({
            name: item.name,
            buffer,
            type: item.type || "image/jpeg",
          });
        }
      }
    } else {
      const body = await c.req.json();
      title = body.title || "";
      description = body.description || "";
      isActive = Boolean(body.isActive);
      images = Array.isArray(body.images) ? body.images : [];
    }

    if (!title.trim()) {
      return sendError(c, "Carousel title is required", 400);
    }

    if (imageFiles.length === 0 && images.length === 0) {
      return sendError(c, "At least one image is required for a carousel", 400);
    }

    const created = await CarouselsService.create(
      {
        title,
        description,
        images,
        isActive,
      },
      imageFiles
    );

    return sendSuccess(c, created, "Carousel created successfully", 201);
  } catch (error: any) {
    return sendError(c, error.message || "Failed to create carousel", 500);
  }
});

// PATCH /api/v1/carousels/:id/activate - Set carousel as active banner
carouselsRoutes.patch("/:id/activate", authenticate, requireAdmin, async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) return sendError(c, "Carousel ID is required", 400);

    const updated = await CarouselsService.setActive(id);
    if (!updated) return sendError(c, "Carousel not found", 404);

    return sendSuccess(c, updated, "Carousel activated successfully");
  } catch (error: any) {
    return sendError(c, error.message || "Failed to activate carousel", 500);
  }
});

// DELETE /api/v1/carousels/:id - Delete carousel
carouselsRoutes.delete("/:id", authenticate, requireAdmin, async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) return sendError(c, "Carousel ID is required", 400);

    const deleted = await CarouselsService.delete(id);
    if (!deleted) return sendError(c, "Carousel not found", 404);

    return sendSuccess(c, deleted, "Carousel deleted successfully");
  } catch (error: any) {
    const isClientError = error.message && error.message.includes("Active carousel cannot be deleted");
    return sendError(c, error.message || "Failed to delete carousel", isClientError ? 400 : 500);
  }
});
