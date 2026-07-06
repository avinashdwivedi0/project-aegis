import {
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { useSidebar } from "@/hooks/useSidebar";

function SidebarCollapseButton() {
  const { collapsed, toggleSidebar } =
    useSidebar();

  return (
    <button
      onClick={toggleSidebar}
      aria-label={
        collapsed
          ? "Expand sidebar"
          : "Collapse sidebar"
      }
      title={
        collapsed
          ? "Expand sidebar"
          : "Collapse sidebar"
      }
      className="
        rounded-xl
        p-2
        text-slate-400
        transition-all
        duration-200
        hover:bg-slate-800
        hover:text-cyan-400
        focus:outline-none
        focus-visible:ring-2
        focus-visible:ring-cyan-500
      "
    >
      {collapsed ? (
        <PanelLeftOpen size={20} />
      ) : (
        <PanelLeftClose size={20} />
      )}
    </button>
  );
}

export default SidebarCollapseButton;