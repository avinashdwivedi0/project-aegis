import { useMobileSidebar } from "@/hooks/useMobileSidebar";

function MobileSidebarOverlay() {
  const { open, closeSidebar } =
    useMobileSidebar();

  return (
    <div
      onClick={closeSidebar}
      className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
        open
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0"
      }`}
    />
  );
}

export default MobileSidebarOverlay;