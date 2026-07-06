import React from "react";
import ReactDOM from "react-dom/client";
import { MobileSidebarProvider } from "./context/MobileSidebarProvider";

import App from "./App";
import "./style.css";

import { AuthProvider } from "./context/AuthProvider";
import { SidebarProvider } from "./context/SidebarProvider";

import { Toaster } from "sonner";

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
  <AuthProvider>
    <SidebarProvider>
      <MobileSidebarProvider>
        <App />
        <Toaster
          richColors
          position="top-right"
          closeButton
        />
      </MobileSidebarProvider>
    </SidebarProvider>
  </AuthProvider>
</React.StrictMode>
);