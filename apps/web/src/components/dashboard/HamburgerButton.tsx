import { Menu } from "lucide-react";

import { useMobileSidebar } from "@/hooks/useMobileSidebar";

function HamburgerButton() {
  const { openSidebar } = useMobileSidebar();

  return (
    <button
      onClick={openSidebar}
      aria-label="Open navigation"
      title="Open navigation"
      className="
        rounded-xl
        p-2
        transition-all
        duration-200
        hover:bg-slate-800
        hover:text-cyan-400
        focus:outline-none
        focus-visible:ring-2
        focus-visible:ring-cyan-500
        lg:hidden
      "
    >
      <Menu size={22} />
    </button>
  );
}

export default HamburgerButton;