import { Shield } from "lucide-react";

type SidebarLogoProps = {
  collapsed?: boolean;
};

function SidebarLogo({
  collapsed = false,
}: SidebarLogoProps) {
  return (
    <div
      className={`flex items-center border-b border-[#edf0f4] p-6 transition-all duration-300 ${
        collapsed ? "justify-center" : "gap-3"
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1264d8] text-white">
        <Shield className="h-5 w-5" />
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          collapsed
            ? "max-w-0 opacity-0"
            : "max-w-xs opacity-100"
        }`}
      >
        <h1 className="whitespace-nowrap text-xl font-bold">
          Project Aegis
        </h1>

          <p className="whitespace-nowrap text-xs text-[#667085]">
          Software quality workspace
        </p>
      </div>
    </div>
  );
}

export default SidebarLogo;