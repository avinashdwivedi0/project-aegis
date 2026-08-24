import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-6">
      <div className="w-full max-w-md rounded-2xl border border-[#dfe4eb] bg-white p-8 text-center shadow-[0_12px_36px_rgba(23,32,51,0.08)]">
        <Compass className="mx-auto text-[#1264d8]" size={38} />
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-[#1264d8]">404 error</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#172033]">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-[#667085]">That workspace route does not exist or has moved.</p>
        <Link className="mt-7 inline-flex rounded-lg bg-[#1264d8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0b4da8]" to="/">Return home</Link>
      </div>
    </div>
  );
}

export default NotFoundPage;