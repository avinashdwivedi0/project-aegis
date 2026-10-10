import { Activity, Bot, Clock3, ShieldCheck, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { EmptyState, PageScaffold } from "@/components/ui/PageScaffold";
import FindingsDashboard from "@/components/analysis/FindingsDashboard";
import AnalysisProgress from "@/components/analysis/AnalysisProgress";
import { getAnalysisRuns, type AnalysisRunSummary } from "@/services/analysis";

function AnalysisPage() {
  const [searchParams] = useSearchParams();
  const runId = searchParams.get("runId");
  const [runs, setRuns] = useState<AnalysisRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    void getAnalysisRuns().then((data) => { if (active) setRuns(data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const cards = [
    [Activity, "Ready to analyze", "Choose a repository to begin a new assessment."],
    [ShieldCheck, "Quality signals", "Security, reliability, and maintainability checks."],
    [Clock3, "Recent runs", "Your completed analysis history will appear here."],
  ] as const;

  return (
    <PageScaffold eyebrow="Quality intelligence" title="AI Analysis" description="Run focused quality checks across your repositories and review evidence as it arrives." icon={Bot}>
      <div className="grid gap-5 md:grid-cols-3">
        {cards.map(([Icon, label, detail]) => <div key={label} className="rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]"><Icon className="text-[#1264d8]" size={20} /><h2 className="mt-4 font-semibold text-[#172033]">{label}</h2><p className="mt-2 text-sm leading-6 text-[#667085]">{detail}</p></div>)}
      </div>
      {runId && <FindingsDashboard runId={runId} />}
      {runId && <AnalysisProgress runId={runId} />}
      {loading && <div className="mt-6 flex items-center gap-2 text-sm text-[#667085]"><Loader2 className="animate-spin" size={17} /> Loading analysis runs...</div>}
      {error && <p className="mt-6 text-sm text-red-600">Unable to load analysis runs.</p>}
      {!loading && !error && runs.length === 0 && <EmptyState icon={Bot} title="No analysis runs yet" description="Connect a repository and launch your first quality assessment from the repository workspace." action="View repositories" onAction={() => window.location.assign("/projects")} />}
      {!loading && !error && runs.length > 0 && <section className="mt-6 overflow-hidden rounded-xl border border-[#dfe4eb] bg-white"><h2 className="border-b border-[#edf0f4] px-5 py-4 font-semibold text-[#172033]">Recent analysis runs</h2><div className="divide-y divide-[#edf0f4]">{runs.map((run) => <div key={run.id} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="font-medium text-[#172033]">{run.repository.name}</p><p className="mt-1 text-xs text-[#667085]">{run.status} · {run.progress}% · {run.ref}</p></div><Link to={`/analysis?runId=${run.id}`} className="rounded-lg border border-[#dfe4eb] px-3 py-2 text-sm font-semibold text-[#1264d8]">Open</Link></div>)}</div></section>}
    </PageScaffold>
  );
}

export default AnalysisPage;
