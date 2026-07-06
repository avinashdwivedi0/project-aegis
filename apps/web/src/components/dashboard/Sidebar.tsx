import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/hooks/useSidebar";

import SidebarCollapseButton from "./SidebarCollapseButton";
import SidebarLogo from "./SidebarLogo";
import SidebarNavItem from "./SidebarNavItem";
import SidebarTooltip from "./SidebarTooltip";
import { sidebarLinks } from "./SidebarLinks";

function Sidebar() {
  const navigate = useNavigate();

  const { logout } = useAuth();
  const { collapsed } = useSidebar();

  function handleLogout() {
    navigate("/", { replace: true });

    setTimeout(() => {
      logout();
    }, 100);
  }

  return (
    <aside
      className={`hidden h-screen shrink-0 border-r border-slate-800 bg-slate-900 transition-all duration-300 ease-in-out lg:flex lg:flex-col ${
        collapsed ? "w-24" : "w-72"
      }`}
    >
      {/* Logo */}
      <SidebarLogo collapsed={collapsed} />

      {/* Collapse Button */}
      <div
        className={`flex border-b border-slate-800 p-3 ${
          collapsed ? "justify-center" : "justify-end"
        }`}
      >
        <SidebarCollapseButton />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-4">
        {sidebarLinks.map((link) => (
          <SidebarNavItem
            key={link.path}
            icon={link.icon}
            title={link.title}
            path={link.path}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Logout */}
      <div className="group relative border-t border-slate-800 p-4">
        <button
          onClick={handleLogout}
          aria-label="Logout"
          className={`flex w-full items-center rounded-xl px-4 py-3 text-red-400 transition-all duration-200 hover:bg-red-500/10 ${
            collapsed ? "justify-center" : "gap-3"
          }`}
        >
          <LogOut size={20} />

          {!collapsed && (
            <span className="font-medium">Logout</span>
          )}
        </button>

        {collapsed && <SidebarTooltip label="Logout" />}
      </div>
    </aside>
  );
}

export default Sidebar;