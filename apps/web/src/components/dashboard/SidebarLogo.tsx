import { Shield } from "lucide-react";

type SidebarLogoProps = {
  collapsed?: boolean;
};

function SidebarLogo({
  collapsed = false,
}: SidebarLogoProps) {
  return (
    <div
      className={`flex items-center border-b border-slate-800 p-6 transition-all duration-300 ${
        collapsed ? "justify-center" : "gap-3"
      }`}
    >
      <Shield className="h-9 w-9 shrink-0 text-cyan-400" />

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

        <p className="whitespace-nowrap text-xs text-slate-400">
          AI Software QA Platform
        </p>
      </div>
    </div>
  );
}

export default SidebarLogo;