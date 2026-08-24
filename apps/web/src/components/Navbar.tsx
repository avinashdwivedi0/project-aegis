import { Link } from "react-router-dom";
import { Button } from "./ui/button";

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#dfe4eb] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link
          to="/"
          className="text-xl font-semibold tracking-tight text-[#172033] transition hover:text-[#1264d8]"
        >
          Project Aegis
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            to="/"
            className="text-sm font-medium text-[#667085] transition hover:text-[#1264d8]"
          >
            Home
          </Link>

          <a
            href="#features"
            className="text-sm font-medium text-[#667085] transition hover:text-[#1264d8]"
          >
            Features
          </a>

          <a
            href="#how-it-works"
            className="text-sm font-medium text-[#667085] transition hover:text-[#1264d8]"
          >
            How It Works
          </a>

          <a
            href="#tech-stack"
            className="text-sm font-medium text-[#667085] transition hover:text-[#1264d8]"
          >
            Tech Stack
          </a>

          <Link
            to="/login"
            className="text-sm font-medium text-slate-300 transition hover:text-cyan-400"
          >
            Login
          </Link>

          <Button asChild>
            <Link to="/register">Get Started</Link>
          </Button>
        </nav>

        {/* Mobile Button (placeholder) */}
        <Button
          variant="outline"
          className="md:hidden"
        >
          Menu
        </Button>
      </div>
    </header>
  );
}

export default Navbar;