import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { UploadsService } from "./uploads.service.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { authenticate } from "../../middleware/auth.middleware.js";

export const uploadsRoutes = new Hono();

uploadsRoutes.use("*", authenticate);

const presignedSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  folder: z.enum(["products", "avatars", "categories", "banners"]).default("products"),
});

// POST /api/v1/uploads/presigned-url
uploadsRoutes.post("/presigned-url", zValidator("json", presignedSchema), async (c) => {
  try {
    const { fileName, contentType, folder } = c.req.valid("json");
    const result = await UploadsService.getPresignedUpload(fileName, contentType, folder);
    return sendSuccess(c, result, "Pre-signed upload URL generated successfully");
  } catch (error: any) {
    return sendError(c, error.message || "Failed to generate presigned upload URL", 500);
  }
});

// POST /api/v1/uploads/direct - Direct upload of file(s) to Cloudflare R2 (multipart/form-data)
uploadsRoutes.post("/direct", async (c) => {
  try {
    const formData = await c.req.formData();
    const folder = (formData.get("folder") as string) || "products";

    const candidates = [
      ...formData.getAll("file"),
      ...formData.getAll("files"),
      ...formData.getAll("image"),
      ...formData.getAll("images"),
    ];

    const uploaded = [];
    for (const item of candidates) {
      if (item instanceof File && item.size > 0) {
        const buffer = Buffer.from(await item.arrayBuffer());
        const res = await UploadsService.uploadDirect(
          item.name,
          buffer,
          item.type || "application/octet-stream",
          folder
        );
        uploaded.push({
          fileName: item.name,
          contentType: item.type,
          size: item.size,
          ...res,
        });
      }
    }

    if (uploaded.length === 0) {
      return sendError(c, "No valid file found in request form-data (key: 'file', 'image', or 'images')", 400);
    }

    return sendSuccess(
      c,
      uploaded.length === 1 ? uploaded[0] : uploaded,
      "File(s) uploaded successfully to Cloudflare R2",
      201
    );
  } catch (error: any) {
    return sendError(c, error.message || "Failed to upload file to R2", 500);
  }
});

// DELETE /api/v1/uploads - Delete file from R2
uploadsRoutes.delete("/", async (c) => {
  try {
    const body = await c.req.json();
    const keyOrUrl = body.key || body.url;
    if (!keyOrUrl) {
      return sendError(c, "File key or url is required", 400);
    }
    await UploadsService.deleteFile(keyOrUrl);
    return sendSuccess(c, null, "File deleted from Cloudflare R2 successfully");
  } catch (error: any) {
    return sendError(c, error.message || "Failed to delete file from R2", 500);
  }
});

