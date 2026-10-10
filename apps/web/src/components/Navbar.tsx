import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
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

        <Button
          variant="outline"
          className="md:hidden"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-public-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "Close" : "Menu"}
        </Button>
      </div>
      {menuOpen && <nav id="mobile-public-navigation" className="grid gap-3 border-t border-[#dfe4eb] bg-white px-6 py-4 md:hidden">
        <Link onClick={() => setMenuOpen(false)} to="/" className="py-2 text-sm font-medium text-[#344054]">Home</Link>
        <a onClick={() => setMenuOpen(false)} href="/#features" className="py-2 text-sm font-medium text-[#344054]">Features</a>
        <a onClick={() => setMenuOpen(false)} href="/#how-it-works" className="py-2 text-sm font-medium text-[#344054]">How It Works</a>
        <a onClick={() => setMenuOpen(false)} href="/#tech-stack" className="py-2 text-sm font-medium text-[#344054]">Tech Stack</a>
        <Link onClick={() => setMenuOpen(false)} to="/login" className="py-2 text-sm font-medium text-[#344054]">Login</Link>
        <Link onClick={() => setMenuOpen(false)} to="/register" className="py-2 text-sm font-semibold text-[#1264d8]">Get Started</Link>
      </nav>}
    </header>
  );
}

export default Navbar;
