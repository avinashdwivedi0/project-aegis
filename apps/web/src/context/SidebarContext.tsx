import { createContext } from "react";

export type SidebarContextType = {
  collapsed: boolean;
  toggleSidebar: () => void;
};

export const SidebarContext =
  createContext<SidebarContextType | null>(null);