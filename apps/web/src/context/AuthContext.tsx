import { createContext } from "react";
import * as authService from "../services/auth";

type User = authService.User;

type LoginData = authService.LoginRequest;
type RegisterData = authService.RegisterRequest;

export type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(
  null
);