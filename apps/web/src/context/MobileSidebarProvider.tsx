import {
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

import { MobileSidebarContext } from "./MobileSidebarContext";

type Props = {
  children: ReactNode;
};

export function MobileSidebarProvider({
  children,
}: Props) {
  const [open, setOpen] = useState(false);

  const openSidebar = useCallback(() => {
    setOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      open,
      openSidebar,
      closeSidebar,
      toggleSidebar,
    }),
    [open, openSidebar, closeSidebar, toggleSidebar]
  );

  return (
    <MobileSidebarContext.Provider value={value}>
      {children}
    </MobileSidebarContext.Provider>
  );
}