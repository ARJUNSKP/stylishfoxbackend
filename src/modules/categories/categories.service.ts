import { eq } from "drizzle-orm";
import { db } from "../../config/database.js";
import { categories } from "../../db/schema/index.js";

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
}
