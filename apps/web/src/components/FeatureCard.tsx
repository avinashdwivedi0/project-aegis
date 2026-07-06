import type { LucideIcon } from "lucide-react";

type FeatureCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
};

function FeatureCard({
  title,
  description,
  icon: Icon,
}: FeatureCardProps) {
  return (
    <div
      className="
      group
      rounded-3xl
      border
      border-slate-800
      bg-slate-900/70
      p-8
      backdrop-blur
      transition-all
      duration-300
      hover:-translate-y-2
      hover:border-cyan-500
      hover:shadow-xl
      hover:shadow-cyan-500/10
      "
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10">
        <Icon className="h-8 w-8 text-cyan-400 transition-transform duration-300 group-hover:scale-110" />
      </div>

      <h3 className="mb-4 text-2xl font-bold text-white">
        {title}
      </h3>

      <p className="leading-7 text-slate-400">
        {description}
      </p>
    </div>
  );
}

export default FeatureCard;