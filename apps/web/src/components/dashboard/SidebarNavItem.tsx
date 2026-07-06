import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";

import SidebarTooltip from "./SidebarTooltip";

type SidebarNavItemProps = {
  icon: LucideIcon;
  title: string;
  path: string;
  collapsed?: boolean;
  onClick?: () => void;
};

function SidebarNavItem({
  icon: Icon,
  title,
  path,
  collapsed = false,
  onClick,
}: SidebarNavItemProps) {
  return (
    <div className="group relative">
      <NavLink
        to={path}
        onClick={onClick}
        className={({ isActive }) =>
          `relative flex items-center overflow-hidden rounded-xl px-4 py-3 transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
            collapsed ? "justify-center" : "gap-3"
          } ${
            isActive
              ? "bg-cyan-500/15 text-cyan-400 shadow-lg shadow-cyan-500/10"
              : "text-slate-300 hover:bg-slate-800 hover:text-white hover:translate-x-1"
          }`
        }
      >
        {({ isActive }) => (
          <>
            {/* Active Indicator */}
            <span
              className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-all duration-300 ${
                isActive
                  ? "bg-cyan-400 opacity-100"
                  : "opacity-0"
              }`}
            />

            {/* Icon */}
            <Icon
              size={20}
              className={`shrink-0 transition-colors duration-300 ${
                isActive
                  ? "text-cyan-400"
                  : "text-slate-400 group-hover:text-white"
              }`}
            />

            {/* Label */}
            {!collapsed && (
              <span className="whitespace-nowrap font-medium">
                {title}
              </span>
            )}
          </>
        )}
      </NavLink>

      {collapsed && (
        <SidebarTooltip label={title} />
      )}
    </div>
  );
}

export default SidebarNavItem;