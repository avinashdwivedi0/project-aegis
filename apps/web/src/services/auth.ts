import api from "./api";

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
};

export type AuthResponse = {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
};

export async function register(data: RegisterRequest) {
  const response = await api.post<AuthResponse>(
    "/auth/register",
    data
  );

  return response.data;
}

export async function login(data: LoginRequest) {
  const response = await api.post<AuthResponse>(
    "/auth/login",
    data
  );

  return response.data;
}

export async function getCurrentUser() {
  const response = await api.get<{
    success: boolean;
    message: string;
    data: User;
  }>("/auth/me");

  return response.data;
}

export function logout() {
  localStorage.removeItem("token");
}