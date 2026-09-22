import { prisma } from "../../config/prisma";
import { generateToken } from "../../utils/jwt";
import { hashPassword, verifyPassword } from "../../utils/password";
import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
} from "./auth.types";

export class AuthService {
  static async register(
    data: RegisterInput
  ): Promise<AuthResponse> {
    const existingUser = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (existingUser) {
      throw new Error("Email already exists");
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    };
  }

  static async login(
    data: LoginInput
  ): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isPasswordValid = await verifyPassword(
      data.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    };
  }

  static async getCurrentUser(userId: string) {
    return prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        preferences: true,
      },
    });
  }

  static async updatePreferences(userId: string, preferences: { defaultRef?: string; polling?: boolean }) {
    return prisma.user.update({
      where: { id: userId },
      data: { preferences },
      select: { preferences: true },
    });
  }
}