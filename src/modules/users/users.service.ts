import { eq, desc } from "drizzle-orm";
import { db } from "../../config/database.js";
import { users, type UserAddressItem } from "../../db/schema/index.js";

export class UsersService {
  static async getProfile(userId: string) {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        phoneNumber: users.phoneNumber,
        whatsappNumber: users.whatsappNumber,
        avatarUrl: users.avatarUrl,
        address: users.address,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user || null;
  }

  static async getAllUsers() {
    return await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        phoneNumber: users.phoneNumber,
        whatsappNumber: users.whatsappNumber,
        avatarUrl: users.avatarUrl,
        address: users.address,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  static async updateProfile(
    userId: string,
    data: {
      name?: string;
      phoneNumber?: string;
      whatsappNumber?: string;
      avatarUrl?: string;
      address?: UserAddressItem[];
    }
  ) {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        phoneNumber: users.phoneNumber,
        whatsappNumber: users.whatsappNumber,
        avatarUrl: users.avatarUrl,
        address: users.address,
      });

    return updated || null;
  }

  static async addAddress(userId: string, newAddress: { address: any; ActiveAddress?: boolean }) {
    const user = await this.getProfile(userId);
    if (!user) throw new Error("User not found");

    let currentAddresses: UserAddressItem[] = Array.isArray(user.address) ? [...user.address] : [];

    // If new address is marked as ActiveAddress, set ActiveAddress = false on all other addresses
    const isActive = newAddress.ActiveAddress === true || currentAddresses.length === 0;

    if (isActive) {
      currentAddresses = currentAddresses.map((item) => ({
        ...item,
        ActiveAddress: false,
      }));
    }

    const entry: UserAddressItem = {
      address: newAddress.address,
      ActiveAddress: isActive,
    };

    currentAddresses.push(entry);

    return await this.updateProfile(userId, { address: currentAddresses });
  }

  static async updateAddress(userId: string, addressIndex: number, updatedAddress: any) {
    const user = await this.getProfile(userId);
    if (!user) throw new Error("User not found");

    let currentAddresses: UserAddressItem[] = Array.isArray(user.address) ? [...user.address] : [];
    if (addressIndex < 0 || addressIndex >= currentAddresses.length) {
      throw new Error("Invalid address index");
    }

    const existingEntry = currentAddresses[addressIndex];
    const isAlreadyActive = existingEntry?.ActiveAddress === true;

    // Preserve ActiveAddress status unless explicitly specified
    const updatedEntry: UserAddressItem = {
      address: {
        ...(typeof existingEntry?.address === "object" ? existingEntry.address : {}),
        ...updatedAddress,
      },
      ActiveAddress: updatedAddress.ActiveAddress !== undefined ? updatedAddress.ActiveAddress : isAlreadyActive,
    };

    currentAddresses[addressIndex] = updatedEntry;

    return await this.updateProfile(userId, { address: currentAddresses });
  }

  static async setActiveAddress(userId: string, addressIndex: number) {
    const user = await this.getProfile(userId);
    if (!user) throw new Error("User not found");

    const currentAddresses: UserAddressItem[] = Array.isArray(user.address) ? [...user.address] : [];
    if (addressIndex < 0 || addressIndex >= currentAddresses.length) {
      throw new Error("Invalid address index");
    }

    const updatedAddresses = currentAddresses.map((item, index) => ({
      ...item,
      ActiveAddress: index === addressIndex,
    }));

    return await this.updateProfile(userId, { address: updatedAddresses });
  }

  static async deleteAddress(userId: string, addressIndex: number) {
    const user = await this.getProfile(userId);
    if (!user) throw new Error("User not found");

    let currentAddresses: UserAddressItem[] = Array.isArray(user.address) ? [...user.address] : [];
    if (addressIndex < 0 || addressIndex >= currentAddresses.length) {
      throw new Error("Invalid address index");
    }

    const wasActive = currentAddresses[addressIndex]?.ActiveAddress;
    currentAddresses.splice(addressIndex, 1);

    if (wasActive && currentAddresses.length > 0) {
      currentAddresses[0].ActiveAddress = true;
    }

    return await this.updateProfile(userId, { address: currentAddresses });
  }
}
