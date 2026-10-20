import { z } from "zod";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const createProductVariantInputSchema = z.object({
  sku: z.string().optional(),
  price: z.union([z.string(), z.number()]).optional(),
  sellingPrice: z.union([z.string(), z.number()]).optional(),
  stock: z.number().int().nonnegative().optional().default(0),
  colorId: z.string().uuid().optional(),
  sizeId: z.string().uuid().optional(),
  images: z.array(z.string()).optional().default([]),
  isPublished: z.boolean().optional().default(true),
  published: z.boolean().optional(),
});

export const updateProductVariantSchema = z.object({
  sku: z.string().optional(),
  price: z.union([z.string(), z.number()]).optional(),
  sellingPrice: z.union([z.string(), z.number()]).optional(),
  stock: z.number().int().nonnegative().optional(),
  colorId: z.string().uuid().optional().nullable(),
  sizeId: z.string().uuid().optional().nullable(),
  images: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
  published: z.boolean().optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(2, "Product name is required"),
  slug: z.string().min(2).optional(),
  tagline: z.string().optional(),
  description: z.string().optional(),
  rating: z.string().regex(/^\d+(\.\d)?$/, "Valid rating format required (e.g. 4.5)").optional().default("0.0"),
  reviewCount: z.number().int().nonnegative().optional().default(0),
  features: z.union([z.array(z.string()), z.string()]).optional().default([]),
  images: z.array(z.string()).optional().default([]),
  categoryId: z.string().uuid().optional(),
  // Optional variant details on initial product creation
  price: z.union([z.string(), z.number()]).optional(),
  sellingPrice: z.union([z.string(), z.number()]).optional(),
  stock: z.number().int().nonnegative().optional(),
  sku: z.string().optional(),
  colorId: z.string().uuid().optional(),
  sizeId: z.string().uuid().optional(),
  isPublished: z.boolean().optional().default(true),
  published: z.boolean().optional(),
  variants: z.array(createProductVariantInputSchema).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateProductVariantInput = z.infer<typeof createProductVariantInputSchema>;
export type UpdateProductVariantInput = z.infer<typeof updateProductVariantSchema>;

