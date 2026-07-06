import { z } from "zod";
import {
  registerBodySchema,
  loginBodySchema,
} from "./auth.schema";

export type RegisterInput = z.infer<
  typeof registerBodySchema
>;

export type LoginInput = z.infer<
  typeof loginBodySchema
>;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}