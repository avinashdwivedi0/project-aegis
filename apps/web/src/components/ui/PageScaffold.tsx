import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { ArrowUpRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";

type PageScaffoldProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
  workspacePath?: string;
};

export function PageScaffold({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
  workspacePath = "/projects",
}: PageScaffoldProps) {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-[1440px] space-y-8">
      <header className="relative overflow-hidden rounded-2xl border border-[#dfe4eb] bg-white px-6 py-7 shadow-[0_10px_30px_rgba(23,32,51,0.05)] md:px-8">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-[linear-gradient(120deg,transparent,#e8f1ff)] opacity-80" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e8f1ff] text-[#1264d8]">
              <Icon size={23} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1264d8]">
                {eyebrow}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#172033]">
                {title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
                {description}
              </p>
            </div>
          </div>
          <Button
            className="shrink-0 gap-2 bg-[#1264d8] text-white hover:bg-[#0b4da8]"
            onClick={() => navigate(workspacePath)}
          >
            <Sparkles size={16} />
            Open workspace
            <ArrowUpRight size={16} />
          </Button>
        </div>
      </header>
      {children}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action: string;
  onAction?: () => void;
}) {
  const navigate = useNavigate();

  return (
    <section className="rounded-2xl border border-dashed border-[#bfd6f8] bg-white px-6 py-16 text-center shadow-[0_10px_30px_rgba(23,32,51,0.04)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#e8f1ff] text-[#1264d8]">
        <Icon size={25} />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-[#172033]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667085]">
        {description}
      </p>
      <Button
        variant="outline"
        className="mt-6 border-[#bfd6f8] text-[#1264d8] hover:bg-[#f3f7fd]"
        onClick={onAction ?? (() => navigate("/projects"))}
      >
        {action}
      </Button>
    </section>
  );
}
