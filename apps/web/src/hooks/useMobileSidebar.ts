import { useContext } from "react";

import { MobileSidebarContext } from "@/context/MobileSidebarContext";

export function useMobileSidebar() {
  const context = useContext(
    MobileSidebarContext
  );

  if (!context) {
    throw new Error(
      "useMobileSidebar must be used inside MobileSidebarProvider"
    );
  }

  return context;
}