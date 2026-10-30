import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ProductsService } from "./products.service.js";
import {
  createProductSchema,
  updateProductSchema,
  createProductVariantInputSchema,
  updateProductVariantSchema,
} from "./products.validation.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { authenticate, requireAdmin } from "../../middleware/auth.middleware.js";

export const productsRoutes = new Hono();

// GET /api/v1/products - List products (with optional filtering)
productsRoutes.get("/", async (c) => {
  const categoryId = c.req.query("categoryId");
  const search = c.req.query("search");
  const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!, 10) : 50;
  const publishedOnly =
    c.req.query("publishedOnly") === "true" || c.req.query("published") === "true";

  const items = await ProductsService.getAll({ categoryId, search, limit, publishedOnly });
  return sendSuccess(c, items, "Products retrieved successfully");
});

// GET /api/v1/products/slug/:slug - Get product by slug
productsRoutes.get("/slug/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (!slug) return sendError(c, "Product slug is required", 400);
  const publishedOnly =
    c.req.query("publishedOnly") === "true" || c.req.query("published") === "true";
  const product = await ProductsService.getBySlug(slug, { publishedOnly });
  if (!product) {
    return sendError(c, "Product not found", 404);
  }
  return sendSuccess(c, product);
});

// GET /api/v1/products/:id/related - Get related products
productsRoutes.get("/:id/related", async (c) => {
  const id = c.req.param("id");
  if (!id) return sendError(c, "Product ID is required", 400);
  const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!, 10) : 4;
  const publishedOnly =
    c.req.query("publishedOnly") === "true" || c.req.query("published") === "true";
  const related = await ProductsService.getRelated(id, limit, { publishedOnly });
  return sendSuccess(c, related, "Related products retrieved successfully");
});

// GET /api/v1/products/:id - Get single product
productsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  if (!id) return sendError(c, "Product ID is required", 400);
  const publishedOnly =
    c.req.query("publishedOnly") === "true" || c.req.query("published") === "true";
  const product = await ProductsService.getById(id, { publishedOnly });
  if (!product) {
    return sendError(c, "Product not found", 404);
  }
  return sendSuccess(c, product);
});

// Helper to extract image files from FormData
async function extractImageFiles(formData: FormData) {
  const fileEntries = [
    ...formData.getAll("image"),
    ...formData.getAll("images"),
    ...formData.getAll("file"),
    ...formData.getAll("files"),
  ];
  const imageFiles: { name: string; buffer: Buffer; type: string }[] = [];
  for (const item of fileEntries) {
    if (item instanceof File && item.size > 0) {
      if (item.size > 5 * 1024 * 1024) {
        throw new Error(`File "${item.name}" exceeds the maximum allowed size of 5 MB (${(item.size / (1024 * 1024)).toFixed(2)} MB)`);
      }
      if (item.type && !item.type.startsWith("image/")) {
        throw new Error(`File "${item.name}" is not a valid image format`);
      }
      const buffer = Buffer.from(await item.arrayBuffer());
      imageFiles.push({
        name: item.name,
        buffer,
        type: item.type || "image/jpeg",
      });
    }
  }
  return imageFiles;
}

// Helper to extract image files for a specific variant index
async function extractVariantImageFiles(formData: FormData, index: number) {
  const keys = [
    `variant_${index}_images`,
    `variant_${index}_image`,
    `variant_${index}_files`,
    `variant_${index}_file`,
    `variants[${index}][images]`,
    `variants[${index}][files]`,
  ];
  const fileEntries: File[] = [];
  for (const k of keys) {
    for (const item of formData.getAll(k)) {
      if (item instanceof File && item.size > 0) {
        fileEntries.push(item);
      }
    }
  }
  const imageFiles: { name: string; buffer: Buffer; type: string }[] = [];
  for (const item of fileEntries) {
    if (item.size > 5 * 1024 * 1024) {
      throw new Error(`File "${item.name}" exceeds the maximum allowed size of 5 MB (${(item.size / (1024 * 1024)).toFixed(2)} MB)`);
    }
    if (item.type && !item.type.startsWith("image/")) {
      throw new Error(`File "${item.name}" is not a valid image format`);
    }
    const buffer = Buffer.from(await item.arrayBuffer());
    imageFiles.push({
      name: item.name,
      buffer,
      type: item.type || "image/jpeg",
    });
  }
  return imageFiles;
}

// POST /api/v1/products - Create new product with automatic R2 image upload (Admin only)
// Supports both multipart/form-data (with file upload) and application/json
productsRoutes.post("/", authenticate, requireAdmin, async (c) => {
  try {
    const contentType = c.req.header("content-type") || "";
    let inputData: any = {};
    let imageFiles: { name: string; buffer: Buffer; type: string }[] = [];
    const variantFilesMap = new Map<number, { name: string; buffer: Buffer; type: string }[]>();

    if (contentType.includes("multipart/form-data")) {
      const formData = await c.req.formData();
      imageFiles = await extractImageFiles(formData);

      const rawFeatures = formData.getAll("features");
      let features: string[] = [];
      if (rawFeatures.length > 1) {
        features = rawFeatures.map(String);
      } else if (rawFeatures.length === 1) {
        const val = String(rawFeatures[0]);
        try {
          features = JSON.parse(val);
        } catch {
          features = val.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }

      const existingImages = formData.getAll("existingImages").map(String);

      // Extract variants if supplied in FormData
      let variants: any = undefined;
      const rawVariants = formData.get("variants");
      if (rawVariants) {
        try {
          variants = JSON.parse(String(rawVariants));
        } catch {
          variants = undefined;
        }
      }

      // Extract any variant-specific image files
      if (Array.isArray(variants)) {
        for (let i = 0; i < variants.length; i++) {
          const vFiles = await extractVariantImageFiles(formData, i);
          if (vFiles.length > 0) {
            variantFilesMap.set(i, vFiles);
          }
        }
      }

      inputData = {
        name: formData.get("name") as string,
        slug: (formData.get("slug") as string) || undefined,
        tagline: (formData.get("tagline") as string) || undefined,
        description: (formData.get("description") as string) || undefined,
        categoryId: (formData.get("categoryId") as string) || undefined,
        rating: (formData.get("rating") as string) || undefined,
        reviewCount: formData.get("reviewCount")
          ? parseInt(formData.get("reviewCount") as string, 10)
          : undefined,
        features,
        images: existingImages,
        price: (formData.get("price") as string) || undefined,
        sellingPrice: ((formData.get("sellingPrice") || formData.get("selling_price") || formData.get("Selling_price")) as string) || undefined,
        stock: formData.get("stock")
          ? parseInt(formData.get("stock") as string, 10)
          : undefined,
        sku: (formData.get("sku") as string) || undefined,
        colorId: (formData.get("colorId") as string) || undefined,
        sizeId: (formData.get("sizeId") as string) || undefined,
        displayType: formData.get("displayType") !== null
          ? parseInt(formData.get("displayType") as string, 10)
          : undefined,
        variants,
      };
    } else {
      inputData = await c.req.json();
    }

    const validation = createProductSchema.safeParse(inputData);
    if (!validation.success) {
      return sendError(
        c,
        validation.error.errors[0]?.message || "Validation failed",
        400
      );
    }

    const product = await ProductsService.create(validation.data, imageFiles, variantFilesMap);
    return sendSuccess(c, product, "Product created and images uploaded to R2 successfully", 201);
  } catch (error: any) {
    return sendError(c, error.message || "Failed to create product", 400);
  }
});

// POST /api/v1/products/:id/images - Upload images directly to an existing product (Admin only)
productsRoutes.post("/:id/images", authenticate, requireAdmin, async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) return sendError(c, "Product ID is required", 400);

    const formData = await c.req.formData();
    const imageFiles = await extractImageFiles(formData);

    if (imageFiles.length === 0) {
      return sendError(c, "No image file provided in form-data ('image' or 'images')", 400);
    }

    const result = await ProductsService.addImages(id, imageFiles);
    if (!result) {
      return sendError(c, "Product not found", 404);
    }

    return sendSuccess(
      c,
      result,
      "Images uploaded to Cloudflare R2 and attached to product successfully"
    );
  } catch (error: any) {
    return sendError(c, error.message || "Failed to upload product images", 500);
  }
});

// DELETE /api/v1/products/:id/images - Remove an image from product & delete from R2 (Admin only)
productsRoutes.delete("/:id/images", authenticate, requireAdmin, async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) return sendError(c, "Product ID is required", 400);

    const body = await c.req.json();
    const imageUrl = body.imageUrl || body.url;
    if (!imageUrl) {
      return sendError(c, "Image URL is required (imageUrl)", 400);
    }

    const updated = await ProductsService.removeImage(id, imageUrl);
    if (!updated) {
      return sendError(c, "Product not found", 404);
    }

    return sendSuccess(c, updated, "Image removed from product and purged from R2");
  } catch (error: any) {
    return sendError(c, error.message || "Failed to remove product image", 500);
  }
});

// PUT /api/v1/products/:id - Update product (Admin only)
// Supports multipart/form-data (with new image files) and JSON
productsRoutes.put("/:id", authenticate, requireAdmin, async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) return sendError(c, "Product ID is required", 400);

    const contentType = c.req.header("content-type") || "";
    let inputData: any = {};
    let imageFiles: { name: string; buffer: Buffer; type: string }[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await c.req.formData();
      imageFiles = await extractImageFiles(formData);

      const rawFeatures = formData.getAll("features");
      let features: string[] | undefined = undefined;
      if (rawFeatures.length > 1) {
        features = rawFeatures.map(String);
      } else if (rawFeatures.length === 1) {
        const val = String(rawFeatures[0]);
        try {
          features = JSON.parse(val);
        } catch {
          features = val.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }

      inputData = {
        name: (formData.get("name") as string) || undefined,
        slug: (formData.get("slug") as string) || undefined,
        tagline: (formData.get("tagline") as string) || undefined,
        description: (formData.get("description") as string) || undefined,
        categoryId: (formData.get("categoryId") as string) || undefined,
        rating: (formData.get("rating") as string) || undefined,
        reviewCount: formData.get("reviewCount")
          ? parseInt(formData.get("reviewCount") as string, 10)
          : undefined,
        displayType: formData.get("displayType") !== null
          ? parseInt(formData.get("displayType") as string, 10)
          : undefined,
        features,
      };
    } else {
      inputData = await c.req.json();
    }

    const validation = updateProductSchema.safeParse(inputData);
    if (!validation.success) {
      return sendError(
        c,
        validation.error.errors[0]?.message || "Validation failed",
        400
      );
    }

    const product = await ProductsService.update(id, validation.data, imageFiles);
    if (!product) {
      return sendError(c, "Product not found", 404);
    }
    return sendSuccess(c, product, "Product updated successfully");
  } catch (error: any) {
    return sendError(c, error.message || "Failed to update product", 400);
  }
});

// DELETE /api/v1/products/:id - Delete product and purge images from R2 (Admin only)
productsRoutes.delete("/:id", authenticate, requireAdmin, async (c) => {
  const id = c.req.param("id");
  if (!id) return sendError(c, "Product ID is required", 400);
  const deleted = await ProductsService.delete(id);
  if (!deleted) {
    return sendError(c, "Product not found", 404);
  }
  return sendSuccess(c, deleted, "Product deleted successfully and R2 assets cleaned up");
});

// POST /api/v1/products/:id/variants - Add a variant to product with R2 image upload (Admin only)
productsRoutes.post("/:id/variants", authenticate, requireAdmin, async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) return sendError(c, "Product ID is required", 400);
    const contentType = c.req.header("content-type") || "";
    let data: any = {};
    let imageFiles: { name: string; buffer: Buffer; type: string }[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await c.req.formData();
      imageFiles = await extractImageFiles(formData);
      data = {
        colorId: (formData.get("colorId") as string) || undefined,
        sizeId: (formData.get("sizeId") as string) || undefined,
        price: (formData.get("price") as string) || undefined,
        sellingPrice: (formData.get("sellingPrice") as string) || undefined,
        stock: formData.get("stock") ? parseInt(formData.get("stock") as string, 10) : 0,
        sku: (formData.get("sku") as string) || undefined,
        displayType: formData.get("displayType") !== null
          ? parseInt(formData.get("displayType") as string, 10)
          : undefined,
        isPublished: formData.get("isPublished") !== "false",
      };
      const rawExistingEntries = [
        ...formData.getAll("existingImages"),
        ...formData.getAll("images"),
      ];
      const parsedImages: string[] = [];
      for (const entry of rawExistingEntries) {
        if (typeof entry === "string" && !entry.startsWith("blob:")) {
          if (entry.startsWith("[") && entry.endsWith("]")) {
            try {
              const arr = JSON.parse(entry);
              if (Array.isArray(arr)) {
                for (const item of arr) {
                  if (typeof item === "string" && !item.startsWith("blob:")) {
                    parsedImages.push(item);
                  }
                }
                continue;
              }
            } catch {}
          }
          parsedImages.push(entry);
        }
      }
      data.images = parsedImages;
    } else {
      data = await c.req.json();
    }

    const validation = createProductVariantInputSchema.safeParse(data);
    if (!validation.success) {
      return sendError(c, validation.error.errors[0]?.message || "Validation failed", 400);
    }

    const variant = await ProductsService.createVariant(id, validation.data, imageFiles);
    if (!variant) {
      return sendError(c, "Product not found", 404);
    }
    return sendSuccess(c, variant, "Variant added and images uploaded to R2 successfully", 201);
  } catch (error: any) {
    return sendError(c, error.message || "Failed to create variant", 400);
  }
});

// PUT /api/v1/products/variants/:variantId - Update variant details & R2 image upload (Admin only)
productsRoutes.put("/variants/:variantId", authenticate, requireAdmin, async (c) => {
  try {
    const variantId = c.req.param("variantId");
    if (!variantId) return sendError(c, "Variant ID is required", 400);

    const contentType = c.req.header("content-type") || "";
    let data: any = {};
    let imageFiles: { name: string; buffer: Buffer; type: string }[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await c.req.formData();
      imageFiles = await extractImageFiles(formData);
      data = {
        colorId: (formData.get("colorId") as string) || null,
        sizeId: (formData.get("sizeId") as string) || null,
        price: (formData.get("price") as string) || undefined,
        sellingPrice: (formData.get("sellingPrice") as string) || undefined,
        stock: formData.get("stock") ? parseInt(formData.get("stock") as string, 10) : undefined,
        sku: (formData.get("sku") as string) || undefined,
        displayType: formData.get("displayType") !== null
          ? parseInt(formData.get("displayType") as string, 10)
          : undefined,
        isPublished:
          formData.get("isPublished") !== undefined
            ? formData.get("isPublished") === "true"
            : undefined,
      };
      const rawExistingEntries = [
        ...formData.getAll("existingImages"),
        ...formData.getAll("images"),
      ];
      const parsedImages: string[] = [];
      for (const entry of rawExistingEntries) {
        if (typeof entry === "string" && !entry.startsWith("blob:")) {
          if (entry.startsWith("[") && entry.endsWith("]")) {
            try {
              const arr = JSON.parse(entry);
              if (Array.isArray(arr)) {
                for (const item of arr) {
                  if (typeof item === "string" && !item.startsWith("blob:")) {
                    parsedImages.push(item);
                  }
                }
                continue;
              }
            } catch {}
          }
          parsedImages.push(entry);
        }
      }
      data.images = parsedImages;
    } else {
      data = await c.req.json();
    }

    const validation = updateProductVariantSchema.safeParse(data);
    if (!validation.success) {
      return sendError(c, validation.error.errors[0]?.message || "Validation failed", 400);
    }

    const variant = await ProductsService.updateVariant(variantId, validation.data, imageFiles);
    if (!variant) {
      return sendError(c, "Variant not found", 404);
    }
    return sendSuccess(c, variant, "Variant updated and images uploaded to R2 successfully");
  } catch (error: any) {
    return sendError(c, error.message || "Failed to update variant", 400);
  }
});

// DELETE /api/v1/products/variants/:variantId/images - Remove an image from variant & delete from Cloudflare R2 (Admin only)
productsRoutes.delete("/variants/:variantId/images", authenticate, requireAdmin, async (c) => {
  try {
    const variantId = c.req.param("variantId");
    if (!variantId) return sendError(c, "Variant ID is required", 400);

    const body = await c.req.json();
    const imageUrl = body.imageUrl || body.url;
    if (!imageUrl) {
      return sendError(c, "Image URL is required (imageUrl)", 400);
    }

    const updated = await ProductsService.removeVariantImage(variantId, imageUrl);
    if (!updated) {
      return sendError(c, "Variant not found", 404);
    }

    return sendSuccess(c, updated, "Image removed from variant and purged from Cloudflare R2");
  } catch (error: any) {
    return sendError(c, error.message || "Failed to remove variant image", 500);
  }
});

// PATCH /api/v1/products/variants/:variantId/publish - Toggle/Set variant published status (Admin only)
productsRoutes.patch("/variants/:variantId/publish", authenticate, requireAdmin, async (c) => {
  try {
    const variantId = c.req.param("variantId");
    if (!variantId) return sendError(c, "Variant ID is required", 400);

    let isPublished: boolean | undefined = undefined;
    try {
      const body = await c.req.json();
      if (body && typeof body.isPublished === "boolean") {
        isPublished = body.isPublished;
      } else if (body && typeof body.published === "boolean") {
        isPublished = body.published;
      }
    } catch {
      // Empty body means toggle current value
    }

    const updated = await ProductsService.toggleVariantPublished(variantId, isPublished);
    if (!updated) {
      return sendError(c, "Variant not found", 404);
    }
    return sendSuccess(c, updated, `Variant publish status set to ${updated.isPublished}`);
  } catch (error: any) {
    return sendError(c, error.message || "Failed to toggle variant publish status", 400);
  }
});

// DELETE /api/v1/products/variants/:variantId - Delete a variant (Admin only)
productsRoutes.delete("/variants/:variantId", authenticate, requireAdmin, async (c) => {
  try {
    const variantId = c.req.param("variantId");
    if (!variantId) return sendError(c, "Variant ID is required", 400);
    const deleted = await ProductsService.deleteVariant(variantId);
    if (!deleted) {
      return sendError(c, "Variant not found", 404);
    }
    return sendSuccess(c, deleted, "Variant deleted successfully");
  } catch (error: any) {
    return sendError(c, error.message || "Failed to delete variant", 400);
  }
});

