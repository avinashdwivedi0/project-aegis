import type { ReactNode } from "react";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

function AuthLayout({
  title,
  subtitle,
  children,
}: AuthLayoutProps) {
  return (
    <div className="aegis-auth-shell flex min-h-screen items-center justify-center bg-[#f6f8fb] px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-10 shadow-2xl">

        <div className="mb-10 text-center">

          <h1 className="text-4xl font-black text-white">
            {title}
          </h1>

          <p className="mt-3 text-slate-400">
            {subtitle}
          </p>

        </div>

        {children}

      </div>
    </div>
  );
}

export default AuthLayout;