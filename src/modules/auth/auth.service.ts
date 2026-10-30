import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../../config/database.js";
import { users } from "../../db/schema/index.js";
import { env } from "../../config/env.js";
import type { RegisterInput, LoginInput } from "./auth.validation.js";
import type { UserPayload } from "../../types/index.js";

export class AuthService {
  static async register(input: RegisterInput) {
    const normalizedEmail = input.email.trim().toLowerCase();

    // Fast bcrypt hashing with 8 rounds (~12ms vs 60ms)
    const passwordHash = await bcrypt.hash(input.password, 8);

    try {
      // Single atomic INSERT avoiding redundant SELECT roundtrip
      const [newUser] = await db
        .insert(users)
        .values({
          name: input.name.trim(),
          email: normalizedEmail,
          passwordHash,
          phoneNumber: input.phoneNumber?.trim(),
          role: input.role || "customer",
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          phoneNumber: users.phoneNumber,
          whatsappNumber: users.whatsappNumber,
          avatarUrl: users.avatarUrl,
          address: users.address,
          createdAt: users.createdAt,
        });

      if (!newUser) {
        throw new Error("User with this email already exists");
      }

      const tokens = this.generateTokens({
        id: newUser.id,
        email: newUser.email,
        role: newUser.role as "admin" | "customer",
      });

      return {
        user: newUser,
        token: tokens.accessToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error: any) {
      // PostgreSQL error 23505 = unique_violation
      if (error?.code === "23505" || error?.message?.includes("unique")) {
        throw new Error("User with this email already exists");
      }
      throw error;
    }
  }

  static async login(input: LoginInput) {
    const normalizedEmail = input.email.trim().toLowerCase();

    // Lean SELECT querying only required columns
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
        role: users.role,
        phoneNumber: users.phoneNumber,
        whatsappNumber: users.whatsappNumber,
        avatarUrl: users.avatarUrl,
        address: users.address,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error("Invalid email or password");
    }

    const tokens = this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role as "admin" | "customer",
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        whatsappNumber: user.whatsappNumber,
        avatarUrl: user.avatarUrl,
        address: user.address,
      },
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  static async checkEmailExists(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    return {
      exists: !!user,
      email: normalizedEmail,
      name: user?.name || null,
    };
  }

  static async resetPassword(email: string, newPassword: string) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!newPassword || newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      throw new Error("No account found with this email address");
    }

    const passwordHash = await bcrypt.hash(newPassword, 8);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return { success: true, message: "Password updated successfully" };
  }

  static generateTokens(payload: UserPayload): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN || "7d",
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(
      { ...payload, tokenType: "refresh" },
      env.JWT_SECRET,
      { expiresIn: "30d" } as jwt.SignOptions
    );

    return { accessToken, refreshToken };
  }

  static generateToken(payload: UserPayload): string {
    return this.generateTokens(payload).accessToken;
  }

  static async refreshAccessToken(refreshToken: string) {
    if (!refreshToken) {
      throw new Error("Refresh token is required");
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, env.JWT_SECRET);
    } catch {
      throw new Error("Invalid or expired refresh token");
    }

    if (!decoded || !decoded.id) {
      throw new Error("Invalid refresh token payload");
    }

    // Verify user exists in database
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, decoded.id))
      .limit(1);

    if (!user) {
      throw new Error("User no longer exists");
    }

    const tokens = this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role as "admin" | "customer",
    });

    return {
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
