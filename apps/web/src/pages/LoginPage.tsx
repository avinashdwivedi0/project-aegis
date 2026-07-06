import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import AuthLayout from "../components/auth/AuthLayout";
import AuthForm from "../components/auth/AuthForm";
import { useAuth } from "../hooks/useAuth";

function LoginPage() {
  const { login } = useAuth();

  const navigate = useNavigate();

  const [error, setError] = useState("");

  async function handleLogin(data: {
    email: string;
    password: string;
  }) {
    try {
      setError("");

      await login(data);

      navigate("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed."
      );
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to Project Aegis"
    >
      {error && (
        <div className="mb-6 rounded-xl bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <AuthForm
        type="login"
        onSubmit={handleLogin}
      />

      <p className="mt-8 text-center text-slate-400">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="font-semibold text-cyan-400 hover:text-cyan-300"
        >
          Register
        </Link>
      </p>
    </AuthLayout>
  );
}

export default LoginPage;