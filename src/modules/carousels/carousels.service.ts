import { eq, desc } from "drizzle-orm";
import { db } from "../../config/database.js";
import { carousels } from "../../db/schema/index.js";
import { UploadsService } from "../uploads/uploads.service.js";

export interface ImageFileInput {
  name: string;
  buffer: Buffer;
  type: string;
}

export class CarouselsService {
  /**
   * Get all carousels ordered by newest first
   */
  static async getAll() {
    return await db.select().from(carousels).orderBy(desc(carousels.createdAt));
  }

  /**
   * Get the active carousel for customer banner display
   */
  static async getActive() {
    const [active] = await db
      .select()
      .from(carousels)
      .where(eq(carousels.isActive, true))
      .limit(1);
    return active || null;
  }

  /**
   * Get carousel by id
   */
  static async getById(id: string) {
    const [item] = await db
      .select()
      .from(carousels)
      .where(eq(carousels.id, id))
      .limit(1);
    return item || null;
  }

  /**
   * Create a new carousel with optional direct image upload to Cloudflare R2
   */
  static async create(
    data: {
      title: string;
      description?: string;
      images?: string[];
      isActive?: boolean;
    },
    imageFiles: ImageFileInput[] = []
  ) {
    const uploadedUrls: string[] = [];

    // 1. Upload any multipart image files to Cloudflare R2 under "carousels" folder
    if (imageFiles.length > 0) {
      for (const file of imageFiles) {
        const { url } = await UploadsService.uploadDirect(
          file.name,
          file.buffer,
          file.type,
          "carousels"
        );
        uploadedUrls.push(url);
      }
    }

    // 2. Process any images provided in payload (handle base64 or valid URLs)
    if (Array.isArray(data.images) && data.images.length > 0) {
      for (const img of data.images) {
        if (typeof img === "string") {
          if (img.startsWith("data:") || img.length > 500) {
            const { url } = await UploadsService.uploadBase64(img, "carousels");
            uploadedUrls.push(url);
          } else if (img.startsWith("http://") || img.startsWith("https://")) {
            uploadedUrls.push(img);
          }
        }
      }
    }

    const isActive = Boolean(data.isActive);

    // If setting this carousel as active, deactivate all others so only ONE is active
    if (isActive) {
      await db.update(carousels).set({ isActive: false, updatedAt: new Date() });
    }

    const [created] = await db
      .insert(carousels)
      .values({
        title: data.title,
        description: data.description || "",
        images: uploadedUrls,
        isActive,
      })
      .returning();

    return created;
  }

  /**
   * Set a specific carousel as the active one (deactivates others)
   */
  static async setActive(id: string) {
    // 1. Deactivate all
    await db.update(carousels).set({ isActive: false, updatedAt: new Date() });

    // 2. Activate target
    const [updated] = await db
      .update(carousels)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(carousels.id, id))
      .returning();

    return updated || null;
  }

  /**
   * Delete a carousel and purge its images from Cloudflare R2
   */
  static async delete(id: string) {
    const item = await this.getById(id);
    if (!item) return null;

    if (item.isActive) {
      throw new Error("Active carousel cannot be deleted. Please activate another carousel first before deleting this one.");
    }

    // Purge images from R2
    if (item.images && Array.isArray(item.images)) {
      for (const img of item.images) {
        try {
          await UploadsService.deleteFile(img);
        } catch (err) {
          console.warn("Failed to delete carousel image from R2:", err);
        }
      }
    }

    const [deleted] = await db
      .delete(carousels)
      .where(eq(carousels.id, id))
      .returning();

    return deleted || null;
  }
}
