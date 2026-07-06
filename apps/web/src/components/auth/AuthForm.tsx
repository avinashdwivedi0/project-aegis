import type { FormEvent } from "react";
import { useState } from "react";
import axios from "axios";

type AuthFormProps = {
  type: "login" | "register";
  onSubmit: (data: {
    name?: string;
    email: string;
    password: string;
  }) => Promise<void>;
};

type FieldErrors = {
  name?: string[];
  email?: string[];
  password?: string[];
};

function AuthForm({
  type,
  onSubmit,
}: AuthFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [generalError, setGeneralError] = useState("");
  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setGeneralError("");
    setFieldErrors({});
    setLoading(true);

    try {
      await onSubmit({
        name: type === "register" ? name : undefined,
        email,
        password,
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;

        setGeneralError(
          data?.message ?? "Something went wrong."
        );

        if (data?.errors) {
          setFieldErrors(data.errors);
        }
      } else if (err instanceof Error) {
        setGeneralError(err.message);
      } else {
        setGeneralError("Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {type === "register" && (
        <div>
          <label className="mb-2 block text-sm text-slate-300">
            Full Name
          </label>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
            placeholder="John Doe"
          />

          {fieldErrors.name?.map((error) => (
            <p
              key={error}
              className="mt-2 text-sm text-red-400"
            >
              {error}
            </p>
          ))}
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm text-slate-300">
          Email
        </label>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
          placeholder="john@example.com"
        />

        {fieldErrors.email?.map((error) => (
          <p
            key={error}
            className="mt-2 text-sm text-red-400"
          >
            {error}
          </p>
        ))}
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-300">
          Password
        </label>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
          placeholder="••••••••"
        />

        {fieldErrors.password?.map((error) => (
          <p
            key={error}
            className="mt-2 text-sm text-red-400"
          >
            {error}
          </p>
        ))}
      </div>

      {generalError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {generalError}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-cyan-500 py-3 font-semibold text-white transition hover:bg-cyan-400 disabled:opacity-50"
      >
        {loading
          ? "Please wait..."
          : type === "login"
          ? "Login"
          : "Create Account"}
      </button>
    </form>
  );
}

export default AuthForm;