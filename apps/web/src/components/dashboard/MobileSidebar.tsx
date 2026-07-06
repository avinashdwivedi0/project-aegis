import { useEffect } from "react";
import { LogOut, X } from "lucide-react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { useMobileSidebar } from "@/hooks/useMobileSidebar";

import SidebarLogo from "./SidebarLogo";
import SidebarNavItem from "./SidebarNavItem";
import { sidebarLinks } from "./SidebarLinks";

function MobileSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const { open, closeSidebar } =
    useMobileSidebar();

  const { logout } = useAuth();

  // Close drawer on route change
  useEffect(() => {
  closeSidebar();
}, [location.pathname, closeSidebar]);

  // Close drawer on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeSidebar();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [closeSidebar]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = open
      ? "hidden"
      : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleLogout() {
    closeSidebar();

    navigate("/", {
      replace: true,
    });

    setTimeout(() => {
      logout();
    }, 100);
  }

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-slate-800 bg-slate-900 transition-transform duration-300 ease-in-out lg:hidden ${
        open
          ? "translate-x-0"
          : "-translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <SidebarLogo />

        <button
          onClick={closeSidebar}
          aria-label="Close Sidebar"
          className="mr-4 rounded-xl p-2 transition-all duration-200 hover:bg-slate-800 hover:text-cyan-400"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-4">
        {sidebarLinks.map((link) => (
          <SidebarNavItem
            key={link.path}
            icon={link.icon}
            title={link.title}
            path={link.path}
            collapsed={false}
            onClick={closeSidebar}
          />
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-800 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-400 transition-all duration-200 hover:bg-red-500/10"
        >
          <LogOut size={20} />

          <span className="font-medium">
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}

export default MobileSidebar;