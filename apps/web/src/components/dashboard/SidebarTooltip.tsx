type SidebarTooltipProps = {
  label: string;
};

function SidebarTooltip({
  label,
}: SidebarTooltipProps) {
  return (
    <div
      className="
        pointer-events-none
        absolute
        left-full
        top-1/2
        z-50
        ml-3
        -translate-y-1/2
        whitespace-nowrap
        rounded-lg
        border
        border-slate-700
        bg-slate-900
        px-3
        py-2
        text-sm
        text-white
        opacity-0
        shadow-xl
        transition-all
        duration-200
        group-hover:translate-x-1
        group-hover:opacity-100
      "
      role="tooltip"
    >
      {label}

      {/* Arrow */}
      <div className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1 -translate-y-1/2 rotate-45 border-l border-t border-slate-700 bg-slate-900" />
    </div>
  );
}

export default SidebarTooltip;