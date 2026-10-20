import { eq } from "drizzle-orm";
import { db } from "../../config/database.js";
import { categories, products } from "../../db/schema/index.js";

export class CategoriesService {
  static async getAll() {
    return await db.select().from(categories);
  }

  static async getById(id: string) {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    return category || null;
  }

  static async create(data: { name: string; slug: string; description?: string; imageUrl?: string }) {
    const [category] = await db.insert(categories).values(data).returning();
    return category;
  }

  static async delete(id: string) {
    // Check if any product is assigned to this category
    const linkedProducts = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(eq(products.categoryId, id))
      .limit(5);

    if (linkedProducts.length > 0) {
      throw new Error(
        `Cannot delete category: It is currently assigned to existing product(s) (e.g. "${linkedProducts[0].name}"). Please reassign or remove the product(s) first.`
      );
    }

    const [deleted] = await db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning();

    return deleted || null;
  }
}

