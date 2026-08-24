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
      className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-[#dfe4eb] bg-white transition-transform duration-300 ease-in-out lg:hidden ${
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
          className="mr-4 rounded-lg p-2 transition-all duration-200 hover:bg-[#f3f6fa] hover:text-[#1264d8]"
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
      <div className="border-t border-[#edf0f4] p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-[#b42318] transition-all duration-200 hover:bg-[#fff1f0]"
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