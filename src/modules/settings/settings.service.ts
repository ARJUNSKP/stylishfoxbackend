import { db } from "../../config/database.js";
import { storeSettings } from "../../db/schema/settings.js";
import { eq } from "drizzle-orm";

export interface SettingsData {
  whatsappNumber: string;
  freeShippingThreshold: number;
  shippingFee?: number;
  supportEmail?: string;
  [key: string]: any;
}

const DEFAULT_SETTINGS: SettingsData = {
  whatsappNumber: "918086388058",
  freeShippingThreshold: 2000,
  shippingFee: 149,
};

export class SettingsService {
  async getSettings(key = "general"): Promise<SettingsData> {
    const existing = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.key, key))
      .limit(1);

    if (existing.length > 0 && existing[0].data) {
      return {
        ...DEFAULT_SETTINGS,
        ...existing[0].data,
      };
    }

    return DEFAULT_SETTINGS;
  }

  async updateSettings(data: Partial<SettingsData>, key = "general"): Promise<SettingsData> {
    const current = await this.getSettings(key);
    const updatedData: SettingsData = {
      ...current,
      ...data,
      // Ensure numbers are properly parsed
      freeShippingThreshold:
        data.freeShippingThreshold !== undefined
          ? Number(data.freeShippingThreshold)
          : current.freeShippingThreshold,
      shippingFee:
        data.shippingFee !== undefined
          ? Number(data.shippingFee)
          : current.shippingFee,
    };

    const existing = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.key, key))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(storeSettings)
        .set({
          data: updatedData,
          updatedAt: new Date(),
        })
        .where(eq(storeSettings.key, key));
    } else {
      await db.insert(storeSettings).values({
        key,
        data: updatedData,
      });
    }

    return updatedData;
  }
}

export const settingsService = new SettingsService();
