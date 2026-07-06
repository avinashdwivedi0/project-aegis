import { createContext } from "react";

export type MobileSidebarContextType = {
  open: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
};

export const MobileSidebarContext =
  createContext<MobileSidebarContextType | null>(null);