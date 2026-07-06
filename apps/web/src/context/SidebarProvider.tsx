import {
  useState,
  type ReactNode,
} from "react";

import { SidebarContext } from "./SidebarContext";

type SidebarProviderProps = {
  children: ReactNode;
};

export function SidebarProvider({
  children,
}: SidebarProviderProps) {
  const [collapsed, setCollapsed] =
    useState(false);

  function toggleSidebar() {
    setCollapsed((prev) => !prev);
  }

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        toggleSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}