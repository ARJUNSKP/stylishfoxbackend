import { eq, desc, ilike, and } from "drizzle-orm";
import { db } from "../../config/database.js";
import { products, productVariants, colors, sizes } from "../../db/schema/index.js";
import type { CreateProductInput, UpdateProductInput } from "./products.validation.js";
import { slugify } from "./products.validation.js";
import { UploadsService } from "../uploads/uploads.service.js";
import { R2Service } from "../../services/r2.service.js";

export interface ImageFileInput {
  name: string;
  buffer: Buffer;
  type: string;
}

export class ProductsService {
  static async getAll(options?: { categoryId?: string; search?: string; limit?: number }) {
    const limit = options?.limit || 20;

    const conditions = [];
    if (options?.categoryId) {
      conditions.push(eq(products.categoryId, options.categoryId));
    }
    if (options?.search) {
      conditions.push(ilike(products.name, `%${options.search}%`));
    }

    return await db
      .select()
      .from(products)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(products.createdAt))
      .limit(limit);
  }

  static async getById(id: string) {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!product) return null;

    const variants = await db
      .select({
        id: productVariants.id,
        sku: productVariants.sku,
        price: productVariants.price,
        stock: productVariants.stock,
        images: productVariants.images,
        color: {
          id: colors.id,
          name: colors.name,
          hexCode: colors.hexCode,
        },
        size: {
          id: sizes.id,
          name: sizes.name,
          code: sizes.code,
        },
      })
      .from(productVariants)
      .leftJoin(colors, eq(productVariants.colorId, colors.id))
      .leftJoin(sizes, eq(productVariants.sizeId, sizes.id))
      .where(eq(productVariants.productId, id));

    return {
      ...product,
      variants,
    };
  }

  static async getBySlug(slug: string) {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (!product) return null;

    const variants = await db
      .select({
        id: productVariants.id,
        sku: productVariants.sku,
        price: productVariants.price,
        stock: productVariants.stock,
        images: productVariants.images,
        color: {
          id: colors.id,
          name: colors.name,
          hexCode: colors.hexCode,
        },
        size: {
          id: sizes.id,
          name: sizes.name,
          code: sizes.code,
        },
      })
      .from(productVariants)
      .leftJoin(colors, eq(productVariants.colorId, colors.id))
      .leftJoin(sizes, eq(productVariants.sizeId, sizes.id))
      .where(eq(productVariants.productId, product.id));

    return {
      ...product,
      variants,
    };
  }

  /**
   * Creates a new product and uploads any provided image files or base64 images to Cloudflare R2
   */
  static async create(data: CreateProductInput, imageFiles: ImageFileInput[] = []) {
    const uploadedUrls: string[] = [];

    // 1. Upload any multipart image files to Cloudflare R2
    if (imageFiles.length > 0) {
      for (const file of imageFiles) {
        const { url } = await UploadsService.uploadDirect(
          file.name,
          file.buffer,
          file.type,
          "products"
        );
        uploadedUrls.push(url);
      }
    }

    // 2. Process any images provided in payload (handle base64 upload or keep existing URLs)
    if (Array.isArray(data.images) && data.images.length > 0) {
      for (const img of data.images) {
        if (typeof img === "string") {
          if (img.startsWith("data:") || img.length > 500) {
            // Upload base64 image to R2
            const { url } = await UploadsService.uploadBase64(img, "products");
            uploadedUrls.push(url);
          } else if (img.startsWith("http://") || img.startsWith("https://")) {
            uploadedUrls.push(img);
          }
        }
      }
    }

    // 3. Parse features if passed as JSON string or comma-separated
    let features: string[] = [];
    if (Array.isArray(data.features)) {
      features = data.features;
    } else if (typeof data.features === "string") {
      try {
        const parsed = JSON.parse(data.features);
        features = Array.isArray(parsed) ? parsed : [data.features];
      } catch {
        features = data.features.split(",").map((f) => f.trim()).filter(Boolean);
      }
    }

    // 4. Generate unique slug if not supplied or already taken
    let slug = data.slug ? slugify(data.slug) : slugify(data.name);
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    // 5. Insert product into database
    const [product] = await db
      .insert(products)
      .values({
        name: data.name,
        slug,
        tagline: data.tagline,
        description: data.description,
        rating: data.rating || "0.0",
        reviewCount: data.reviewCount || 0,
        features,
        images: uploadedUrls,
        categoryId: data.categoryId,
      })
      .returning();

    // 6. Handle Variants (if variants array or price/stock provided)
    if (data.variants && Array.isArray(data.variants) && data.variants.length > 0) {
      for (const v of data.variants) {
        const variantImages = v.images && v.images.length > 0 ? v.images : uploadedUrls;
        const sku = v.sku || `SF-${slug.slice(0, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
        await db.insert(productVariants).values({
          productId: product.id,
          sku,
          price: v.price != null ? String(v.price) : "0.00",
          stock: v.stock != null ? Number(v.stock) : 0,
          colorId: v.colorId,
          sizeId: v.sizeId,
          images: variantImages,
        });
      }
    } else if (
      data.price != null ||
      data.stock != null ||
      data.colorId ||
      data.sizeId ||
      data.sku
    ) {
      const sku = data.sku || `SF-${slug.slice(0, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
      await db.insert(productVariants).values({
        productId: product.id,
        sku,
        price: data.price != null ? String(data.price) : "0.00",
        stock: data.stock != null ? Number(data.stock) : 0,
        colorId: data.colorId,
        sizeId: data.sizeId,
        images: uploadedUrls,
      });
    }

    return await this.getById(product.id);
  }

  /**
   * Updates an existing product and optionally uploads new image files to Cloudflare R2
   */
  static async update(
    id: string,
    data: UpdateProductInput,
    imageFiles: ImageFileInput[] = []
  ) {
    const existing = await this.getById(id);
    if (!existing) return null;

    let finalImages = [...(existing.images || [])];

    // Upload newly provided multipart image files
    if (imageFiles.length > 0) {
      for (const file of imageFiles) {
        const { url } = await UploadsService.uploadDirect(
          file.name,
          file.buffer,
          file.type,
          "products"
        );
        finalImages.push(url);
      }
    }

    // Process payload images
    if (Array.isArray(data.images)) {
      const processed: string[] = [];
      for (const img of data.images) {
        if (typeof img === "string") {
          if (img.startsWith("data:") || img.length > 500) {
            const { url } = await UploadsService.uploadBase64(img, "products");
            processed.push(url);
          } else if (img.startsWith("http://") || img.startsWith("https://")) {
            processed.push(img);
          }
        }
      }
      // If client explicitly sent images array, replace/merge with processed
      finalImages = Array.from(new Set([...processed, ...finalImages]));
    }

    let features = existing.features;
    if (data.features) {
      if (Array.isArray(data.features)) {
        features = data.features;
      } else if (typeof data.features === "string") {
        try {
          features = JSON.parse(data.features);
        } catch {
          features = data.features.split(",").map((f) => f.trim()).filter(Boolean);
        }
      }
    }

    await db
      .update(products)
      .set({
        name: data.name ?? existing.name,
        slug: data.slug ? slugify(data.slug) : existing.slug,
        tagline: data.tagline ?? existing.tagline,
        description: data.description ?? existing.description,
        rating: data.rating ?? existing.rating,
        reviewCount: data.reviewCount ?? existing.reviewCount,
        features,
        images: finalImages,
        categoryId: data.categoryId ?? existing.categoryId,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));

    return await this.getById(id);
  }

  /**
   * Adds images directly to an existing product and uploads them to R2
   */
  static async addImages(id: string, imageFiles: ImageFileInput[]) {
    const product = await this.getById(id);
    if (!product) return null;

    const newUrls: string[] = [];
    for (const file of imageFiles) {
      const { url } = await UploadsService.uploadDirect(
        file.name,
        file.buffer,
        file.type,
        "products"
      );
      newUrls.push(url);
    }

    const updatedImages = [...(product.images || []), ...newUrls];

    await db
      .update(products)
      .set({ images: updatedImages, updatedAt: new Date() })
      .where(eq(products.id, id));

    return {
      product: await this.getById(id),
      uploadedUrls: newUrls,
    };
  }

  /**
   * Removes an image from a product and deletes it from Cloudflare R2
   */
  static async removeImage(id: string, imageUrl: string) {
    const product = await this.getById(id);
    if (!product) return null;

    const updatedImages = (product.images || []).filter((url) => url !== imageUrl);

    await db
      .update(products)
      .set({ images: updatedImages, updatedAt: new Date() })
      .where(eq(products.id, id));

    // Delete object from Cloudflare R2
    try {
      await R2Service.deleteFile(imageUrl);
    } catch (err) {
      console.error("Failed to delete file from R2:", err);
    }

    return await this.getById(id);
  }

  /**
   * Deletes a product, cascades variants, and removes associated images from Cloudflare R2
   */
  static async delete(id: string) {
    const product = await this.getById(id);
    if (!product) return null;

    // Collect all image URLs to purge from R2
    const allImages = new Set<string>(product.images || []);
    if (product.variants) {
      for (const v of product.variants) {
        if (Array.isArray(v.images)) {
          v.images.forEach((img) => allImages.add(img));
        }
      }
    }

    const [deleted] = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning();

    // Clean up images from Cloudflare R2 asynchronously
    for (const imgUrl of allImages) {
      try {
        await R2Service.deleteFile(imgUrl);
      } catch (err) {
        console.warn(`Could not delete image ${imgUrl} from R2:`, err);
      }
    }

    return deleted || null;
  }
}
