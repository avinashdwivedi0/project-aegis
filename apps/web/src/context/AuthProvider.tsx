import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";

import * as authService from "../services/auth";
import { AuthContext } from "./AuthContext";

type User = authService.User;

type LoginData = authService.LoginRequest;
type RegisterData = authService.RegisterRequest;

type Props = {
  children: ReactNode;
};

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const token = localStorage.getItem("token");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await authService.getCurrentUser();
        setUser(response.data);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          localStorage.removeItem("token");
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  async function login(data: LoginData) {
    const response = await authService.login(data);

    localStorage.setItem("token", response.data.token);
    setUser(response.data.user);
  }

  async function register(data: RegisterData) {
    const response = await authService.register(data);

    localStorage.setItem("token", response.data.token);
    setUser(response.data.user);
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
