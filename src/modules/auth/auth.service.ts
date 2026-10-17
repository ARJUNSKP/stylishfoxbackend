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
          createdAt: users.createdAt,
        });

      if (!newUser) {
        throw new Error("User with this email already exists");
      }

      const token = this.generateToken({
        id: newUser.id,
        email: newUser.email,
        role: newUser.role as "admin" | "customer",
      });

      return { user: newUser, token };
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

    const token = this.generateToken({
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
        avatarUrl: user.avatarUrl,
        address: user.address,
      },
      token,
    };
  }

  static generateToken(payload: UserPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
  }
}
