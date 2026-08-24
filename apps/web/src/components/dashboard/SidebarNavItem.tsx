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
          `relative flex items-center overflow-hidden rounded-lg px-4 py-3 transition-all duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1264d8] ${
            collapsed ? "justify-center" : "gap-3"
          } ${
            isActive
              ? "bg-[#e8f1ff] text-[#1264d8]"
              : "text-[#667085] hover:bg-[#f3f6fa] hover:text-[#172033]"
          }`
        }
      >
        {({ isActive }) => (
          <>
            {/* Active Indicator */}
            <span
              className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-all duration-300 ${
                isActive
                  ? "bg-[#1264d8] opacity-100"
                  : "opacity-0"
              }`}
            />

            {/* Icon */}
            <Icon
              size={20}
              className={`shrink-0 transition-colors duration-300 ${
                  isActive
                    ? "text-[#1264d8]"
                    : "text-[#98a2b3] group-hover:text-[#172033]"
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