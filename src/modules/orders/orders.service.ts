import { eq, desc } from "drizzle-orm";
import { db } from "../../config/database.js";
import { orders } from "../../db/schema/index.js";

export class OrdersService {
  static async getUserOrders(userId: string) {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  static async getAllOrders() {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  static async getById(id: string) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return order || null;
  }

  static async createOrder(data: {
    userId: string;
    totalAmount: string;
    items: any[];
    shippingAddress: any;
    paymentMethod?: string;
  }) {
    const [newOrder] = await db
      .insert(orders)
      .values({
        userId: data.userId,
        totalAmount: data.totalAmount,
        items: data.items,
        shippingAddress: data.shippingAddress,
        paymentMethod: data.paymentMethod || "cod",
        status: "pending",
        paymentStatus: "unpaid",
      })
      .returning();

    return newOrder;
  }

  static async updateStatus(id: string, status: "pending" | "processing" | "shipped" | "delivered" | "cancelled") {
    const [updated] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updated || null;
  }
}
