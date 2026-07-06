import { Link, useNavigate } from "react-router-dom";

import AuthLayout from "../components/auth/AuthLayout";
import AuthForm from "../components/auth/AuthForm";
import { useAuth } from "../hooks/useAuth";

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleRegister(data: {
    name?: string;
    email: string;
    password: string;
  }) {
    await register({
      name: data.name ?? "",
      email: data.email,
      password: data.password,
    });

    navigate("/dashboard");
  }

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join Project Aegis"
    >
      <AuthForm
        type="register"
        onSubmit={handleRegister}
      />

      <p className="mt-8 text-center text-slate-400">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-cyan-400 hover:text-cyan-300"
        >
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}

export default RegisterPage;