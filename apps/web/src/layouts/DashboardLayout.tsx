import { Outlet } from "react-router-dom";

import Sidebar from "@/components/dashboard/Sidebar";
import MobileSidebar from "@/components/dashboard/MobileSidebar";
import MobileSidebarOverlay from "@/components/dashboard/MobileSidebarOverlay";
import Topbar from "@/components/dashboard/Topbar";

function DashboardLayout() {
  return (
    <div className="aegis-app-shell flex h-screen overflow-hidden bg-[#f6f8fb] text-[#172033]">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar */}
      <MobileSidebar />

      {/* Overlay */}
      <MobileSidebarOverlay />

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />

        <main className="flex-1 overflow-y-auto bg-[#f6f8fb] p-5 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;