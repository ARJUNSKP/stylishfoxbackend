import { eq, and } from "drizzle-orm";
import { db } from "../../config/database.js";
import { cartItems, products } from "../../db/schema/index.js";

export class CartService {
  static async getUserCart(userId: string) {
    return await db
      .select({
        id: cartItems.id,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        selectedSize: cartItems.selectedSize,
        selectedColor: cartItems.selectedColor,
        product: products,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.userId, userId));
  }

  static async addToCart(
    userId: string,
    data: { productId: string; quantity: number; selectedSize?: string; selectedColor?: string }
  ) {
    const existing = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.userId, userId),
          eq(cartItems.productId, data.productId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(cartItems)
        .set({
          quantity: existing[0].quantity + (data.quantity || 1),
          selectedSize: data.selectedSize || existing[0].selectedSize,
          selectedColor: data.selectedColor || existing[0].selectedColor,
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(cartItems)
      .values({
        userId,
        productId: data.productId,
        quantity: data.quantity || 1,
        selectedSize: data.selectedSize,
        selectedColor: data.selectedColor,
      })
      .returning();

    return created;
  }

  static async updateQuantity(userId: string, itemId: string, quantity: number) {
    const [updated] = await db
      .update(cartItems)
      .set({ quantity, updatedAt: new Date() })
      .where(and(eq(cartItems.id, itemId), eq(cartItems.userId, userId)))
      .returning();
    return updated;
  }

  static async removeFromCart(userId: string, itemId: string) {
    const [deleted] = await db
      .delete(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.userId, userId)))
      .returning();
    return deleted;
  }

  static async clearCart(userId: string) {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
  }
}
