import { eq, sql } from "drizzle-orm";
import { db } from "../../config/database.js";
import { salesDetails, productVariants } from "../../db/schema/index.js";

export interface InvoiceSaleItemInput {
  productId?: string;
  variantId?: string;
  productName: string;
  size?: string;
  color?: string;
  quantity: number;
  originalPrice: number;
  sellingPrice: number;
  discountAmount?: number;
  totalAmount: number;
}

export interface CreateInvoiceSaleInput {
  invoiceNumber: string;
  userId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  notes?: string;
  items: InvoiceSaleItemInput[];
}

export class SalesService {
  /**
   * Generates next sequential invoice number starting at SF-INV-00001
   */
  static async getNextInvoiceNumber(): Promise<string> {
    const rows = await db
      .select({ invoiceNumber: salesDetails.invoiceNumber })
      .from(salesDetails)
      .where(sql`${salesDetails.invoiceNumber} LIKE 'SF-INV-%'`);

    let maxNum = 0;
    for (const r of rows) {
      if (!r.invoiceNumber) continue;
      const match = r.invoiceNumber.match(/^SF-INV-(\d+)$/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }

    const nextNum = maxNum + 1;
    const padded = String(nextNum).padStart(5, '0');
    return `SF-INV-${padded}`;
  }

  /**
   * Resets the invoice records so that the sequential number restarts at SF-INV-00001
   */
  static async resetInvoiceCounter(): Promise<string> {
    // Delete sales records to completely reset the counter back to SF-INV-00001
    await db.delete(salesDetails);
    return 'SF-INV-00001';
  }

  /**
   * Records sales details for each line item and reduces stock from product_variants
   */
  static async recordInvoiceSale(data: CreateInvoiceSaleInput) {
    if (!data.items || data.items.length === 0) {
      throw new Error("No items provided for invoice sale");
    }

    const insertedSales = [];

    for (const item of data.items) {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const origPrice = Number(item.originalPrice) || 0;
      const sellPrice = Number(item.sellingPrice) || 0;
      const discount = Number(item.discountAmount) || 0;
      const total = Number(item.totalAmount) || (sellPrice * qty);

      // 1. Insert into sales_details table
      const [record] = await db
        .insert(salesDetails)
        .values({
          invoiceNumber: data.invoiceNumber,
          userId: data.userId || null,
          customerName: data.customerName || "Walk-in Customer",
          customerEmail: data.customerEmail || null,
          customerPhone: data.customerPhone || null,
          customerAddress: data.customerAddress || null,
          productId: item.productId || null,
          variantId: item.variantId || null,
          productName: item.productName,
          size: item.size || null,
          color: item.color || null,
          quantity: qty,
          price: String(origPrice),
          sellingPrice: String(sellPrice),
          discountAmount: String(discount),
          totalAmount: String(total),
          paymentMethod: data.paymentMethod || "Cash on Delivery",
          paymentStatus: data.paymentStatus || "PAID",
          notes: data.notes || null,
        })
        .returning();

      insertedSales.push(record);

      // 2. Reduce product stock from product_variants table
      if (item.variantId) {
        await db
          .update(productVariants)
          .set({
            stock: sql`GREATEST(0, ${productVariants.stock} - ${qty})`,
            updatedAt: new Date(),
          })
          .where(eq(productVariants.id, item.variantId));
      } else if (item.productId) {
        // Fallback: If no explicit variantId was passed, find matching variant by productId
        const conditions = [eq(productVariants.productId, item.productId)];
        const allVariants = await db
          .select({
            id: productVariants.id,
            stock: productVariants.stock,
          })
          .from(productVariants)
          .where(conditions[0])
          .limit(1);

        if (allVariants.length > 0) {
          await db
            .update(productVariants)
            .set({
              stock: sql`GREATEST(0, ${productVariants.stock} - ${qty})`,
              updatedAt: new Date(),
            })
            .where(eq(productVariants.id, allVariants[0].id));
        }
      }
    }

    return insertedSales;
  }
}
