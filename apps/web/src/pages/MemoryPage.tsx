import { Database, FileCode2, Search, Sparkles } from "lucide-react";

import { EmptyState, PageScaffold } from "@/components/ui/PageScaffold";

function MemoryPage() {
  const cards = [
    [FileCode2, "Indexed files", "Repository source files available to retrieval."],
    [Search, "Semantic search", "Find relevant code context across projects."],
    [Sparkles, "AI context", "Grounded memory for better recommendations."],
  ] as const;

  return (
    <PageScaffold eyebrow="Knowledge base" title="Memory" description="Search the indexed code context that powers repository analysis and AI conversations." icon={Database}>
      <div className="grid gap-5 md:grid-cols-3">
        {cards.map(([Icon, label, detail]) => (
          <div key={label} className="rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
            <Icon className="text-[#1264d8]" size={20} />
            <h2 className="mt-4 font-semibold text-[#172033]">{label}</h2>
            <p className="mt-2 text-sm leading-6 text-[#667085]">{detail}</p>
          </div>
        ))}
      </div>
      <EmptyState icon={Database} title="Memory is waiting for an index" description="Import and index a repository to make its code searchable by the AI workspace." action="Open repositories" />
    </PageScaffold>
  );
}

export default MemoryPage;