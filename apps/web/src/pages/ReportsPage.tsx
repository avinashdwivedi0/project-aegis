import { Braces, ClipboardCheck, Download, FileBarChart2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { EmptyState, PageScaffold } from "@/components/ui/PageScaffold";
import { downloadAnalysisReport, downloadAnalysisReportJson, getAnalysisRuns, type AnalysisRunSummary } from "@/services/analysis";

function ReportsPage() {
  const [runs, setRuns] = useState<AnalysisRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState(false);

  useEffect(() => {
    let active = true;
    void getAnalysisRuns().then((nextRuns) => {
      if (active) setRuns(nextRuns);
    }).catch(() => {
      if (active) setError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function handleDownload(runId: string) {
    setDownloading(runId);
    setDownloadError(false);
    try {
      await downloadAnalysisReport(runId);
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(null);
    }
  }

  async function handleJsonDownload(runId: string) {
    setDownloading(runId);
    setDownloadError(false);
    try { await downloadAnalysisReportJson(runId); }
    catch { setDownloadError(true); }
    finally { setDownloading(null); }
  }

  return (
    <PageScaffold eyebrow="Assessment archive" title="Reports" description="Review quality findings, compare assessment runs, and export evidence for your team." icon={FileBarChart2}>
      {loading && <div className="flex items-center gap-2 rounded-xl border border-[#dfe4eb] bg-white p-8 text-sm text-[#667085]"><Loader2 className="animate-spin" size={18} /> Loading reports...</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Unable to load reports for this workspace.</div>}
      {downloadError && <p role="alert" className="text-sm text-red-700">The report download failed. Please try again.</p>}
      {!loading && !error && runs.length === 0 && <EmptyState icon={FileBarChart2} title="No reports generated" description="Complete an analysis run to create your first quality report." action="Start an analysis" onAction={() => window.location.assign("/analysis")} />}
      {!loading && !error && runs.length > 0 && <section className="overflow-hidden rounded-xl border border-[#dfe4eb] bg-white shadow-[0_8px_24px_rgba(23,32,51,0.04)]"><div className="border-b border-[#edf0f4] px-5 py-4"><div className="flex items-center gap-3"><ClipboardCheck className="text-[#1264d8]" size={20} /><div><h2 className="font-semibold text-[#172033]">Recent assessment runs</h2><p className="mt-1 text-sm text-[#667085]">Export evidence from your latest repository analyses.</p></div></div></div><div className="divide-y divide-[#edf0f4]">{runs.map((run) => <div key={run.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-[#172033]">{run.repository.name}</p><p className="mt-1 text-xs text-[#667085]">{run.status} · {run.progress}% · {run.ref}</p></div><div className="flex items-center gap-2"><Link to={`/analysis?runId=${run.id}`} className="rounded-lg border border-[#dfe4eb] px-3 py-2 text-sm font-semibold text-[#1264d8] hover:bg-[#f8fafc]">Open</Link><button type="button" onClick={() => void handleDownload(run.id)} disabled={downloading === run.id} aria-label={`Download Markdown report for ${run.repository.name}`} title="Download Markdown report" className="rounded-lg border border-[#dfe4eb] p-2 text-[#1264d8] hover:bg-[#f8fafc] disabled:opacity-50">{downloading === run.id ? <Loader2 className="animate-spin" size={17} /> : <Download size={17} />}</button><button type="button" onClick={() => void handleJsonDownload(run.id)} disabled={downloading === run.id} aria-label={`Download JSON report for ${run.repository.name}`} title="Download JSON report" className="rounded-lg border border-[#dfe4eb] p-2 text-[#1264d8] hover:bg-[#f8fafc] disabled:opacity-50"><Braces size={17} /></button></div></div>)}</div></section>}
    </PageScaffold>
  );
}

export default ReportsPage;
