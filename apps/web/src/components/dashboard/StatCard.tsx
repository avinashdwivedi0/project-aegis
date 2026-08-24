import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
};

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: StatCardProps) {
  return (
    <div className="rounded-lg border border-[#dfe4eb] bg-white p-5 transition hover:border-[#9abff2] hover:shadow-[0_6px_18px_rgba(23,32,51,0.06)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#667085]">
            {title}
          </p>

          <h2 className="mt-2 text-3xl font-semibold text-[#172033]">
            {value}
          </h2>

          {subtitle && (
            <p className="mt-2 text-xs text-[#98a2b3]">
              {subtitle}
            </p>
          )}
        </div>

        <div className="rounded-lg bg-[#e8f1ff] p-3">
          <Icon
            size={26}
            className="text-[#1264d8]"
          />
        </div>
      </div>
    </div>
  );
}

export default StatCard;