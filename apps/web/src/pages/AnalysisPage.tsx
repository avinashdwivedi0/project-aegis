import { Activity, Bot, Clock3, ShieldCheck } from "lucide-react";

import { EmptyState, PageScaffold } from "@/components/ui/PageScaffold";
import FindingsDashboard from "@/components/analysis/FindingsDashboard";
import { useSearchParams } from "react-router-dom";
import AnalysisProgress from "@/components/analysis/AnalysisProgress";

function AnalysisPage() {
  const [searchParams] = useSearchParams();
  const runId = searchParams.get("runId");
  const cards = [
    [Activity, "Ready to analyze", "Choose a repository to begin a new assessment."],
    [ShieldCheck, "Quality signals", "Security, reliability, and maintainability checks."],
    [Clock3, "Recent runs", "Your completed analysis history will appear here."],
  ] as const;

  return (
    <PageScaffold eyebrow="Quality intelligence" title="AI Analysis" description="Run focused quality checks across your repositories and review evidence as it arrives." icon={Bot}>
      <div className="grid gap-5 md:grid-cols-3">
        {cards.map(([Icon, label, detail]) => (
          <div key={label} className="rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
            <Icon className="text-[#1264d8]" size={20} />
            <h2 className="mt-4 font-semibold text-[#172033]">{label}</h2>
            <p className="mt-2 text-sm leading-6 text-[#667085]">{detail}</p>
          </div>
        ))}
      </div>
      {runId && <FindingsDashboard runId={runId} />}
      {runId && <AnalysisProgress runId={runId} />}
      <EmptyState icon={Bot} title="No analysis runs yet" description="Connect a repository and launch your first quality assessment from the repository workspace." action="View repositories" onAction={() => window.location.assign("/projects")} />
    </PageScaffold>
  );
}

export default AnalysisPage;