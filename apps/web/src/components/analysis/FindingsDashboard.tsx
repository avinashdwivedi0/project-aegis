import { AlertTriangle, CheckCircle2, CircleDot, Download, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { downloadAnalysisReport, generatePatch, getAnalysisScore, getFindings, rejectPatch, type Finding } from "@/services/analysis";
import DiffViewer from "./DiffViewer";

const severityStyles: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  moderate: "bg-amber-100 text-amber-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-blue-100 text-blue-700",
  info: "bg-slate-100 text-slate-600",
};

export default function FindingsDashboard({ runId }: { runId: string }) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [severity, setSeverity] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [patchLoading, setPatchLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      await Promise.resolve();
      if (!active) return;
      setLoading(true);
      setError(false);
      try {
        const [nextFindings, nextScore] = await Promise.all([
          getFindings(runId, {
            ...(severity ? { severity } : {}),
            ...(source ? { source } : {}),
          }),
          getAnalysisScore(runId),
        ]);
        if (!active) return;
        setFindings(nextFindings);
        setScore(nextScore.score);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [runId, severity, source]);

  const icon = score === null ? CircleDot : score >= 80 ? CheckCircle2 : AlertTriangle;
  const ScoreIcon = icon;

  async function handleGeneratePatch() {
    if (!selectedFinding || patchLoading) return;
    setPatchLoading(true);
    try {
      const patch = await generatePatch(selectedFinding.id);
      setSelectedFinding({ ...selectedFinding, diffContent: patch.diffContent });
    } finally {
      setPatchLoading(false);
    }
  }

  async function handleDownloadReport() {
    if (reportLoading) return;
    setReportLoading(true);
    try {
      await downloadAnalysisReport(runId);
    } finally {
      setReportLoading(false);
    }
  }

  async function handleRejectPatch() {
    if (!selectedFinding?.patchId || rejectLoading) return;
    setRejectLoading(true);
    try {
      await rejectPatch(selectedFinding.patchId);
      setSelectedFinding({ ...selectedFinding, status: "rejected" });
      setFindings((current) => current.map((finding) => finding.id === selectedFinding.id ? { ...finding, status: "rejected" } : finding));
    } finally {
      setRejectLoading(false);
    }
  }

  return (
    <section className="space-y-5 rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1264d8]">Run findings</p>
          <h2 className="mt-1 text-xl font-semibold text-[#172033]">Evidence review</h2>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => void handleDownloadReport()} disabled={reportLoading} aria-label="Download analysis report" title="Download analysis report" className="rounded-lg border border-[#dfe4eb] p-2 text-[#1264d8] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50">
            {reportLoading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
          </button>
          <ScoreIcon className={score !== null && score >= 80 ? "text-emerald-600" : "text-amber-600"} size={22} />
          <div>
            <p className="text-2xl font-bold text-[#172033]">{score === null ? "--" : `${score}%`}</p>
            <p className="text-xs text-[#667085]">Scoring v1</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="rounded-lg border border-[#dfe4eb] bg-white px-3 py-2 text-sm text-[#344054]">
          <option value="">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="moderate">Moderate</option>
          <option value="low">Low</option>
          <option value="info">Info</option>
        </select>
        <input value={source} onChange={(event) => setSource(event.target.value)} placeholder="Filter by source" className="rounded-lg border border-[#dfe4eb] px-3 py-2 text-sm text-[#344054] placeholder:text-[#98a2b3]" />
      </div>

      {loading && <div className="flex items-center gap-2 py-8 text-sm text-[#667085]"><Loader2 className="animate-spin" size={17} /> Loading findings...</div>}
      {error && <p className="py-8 text-sm text-red-600">Unable to load findings for this run.</p>}
      {!loading && !error && findings.length === 0 && <p className="py-8 text-sm text-[#667085]">No findings match the selected filters.</p>}
      {!loading && !error && findings.length > 0 && <div className="divide-y divide-[#edf0f4]">{findings.map((finding) => <button key={finding.id} type="button" onClick={() => setSelectedFinding(finding)} className="block w-full py-4 text-left first:pt-1 hover:bg-[#f8fafc]"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityStyles[finding.severity] ?? severityStyles.info}`}>{finding.severity}</span><span className="text-xs font-medium text-[#667085]">{finding.source}</span></div><p className="mt-2 font-medium text-[#172033]">{finding.message}</p><p className="mt-1 text-xs text-[#667085]">{finding.filePath ?? "Repository-level evidence"}{finding.lineStart ? `:${finding.lineStart}` : ""}{finding.code ? ` · ${finding.code}` : ""}</p></button>)}</div>}
      {selectedFinding && <div className="border-t border-[#dfe4eb] pt-5" role="dialog" aria-label="Finding details"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1264d8]">Finding details</p><h3 className="mt-2 text-lg font-semibold text-[#172033]">{selectedFinding.message}</h3></div><button type="button" onClick={() => setSelectedFinding(null)} aria-label="Close finding details" className="rounded-lg p-2 text-[#667085] hover:bg-[#edf0f4]"><X size={18} /></button></div><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-[#667085]">Severity</dt><dd className="mt-1 font-medium capitalize text-[#172033]">{selectedFinding.severity}</dd></div><div><dt className="text-xs text-[#667085]">Status</dt><dd className="mt-1 font-medium capitalize text-[#172033]">{selectedFinding.status}</dd></div><div><dt className="text-xs text-[#667085]">Source</dt><dd className="mt-1 font-medium text-[#172033]">{selectedFinding.source}</dd></div><div><dt className="text-xs text-[#667085]">Rule</dt><dd className="mt-1 font-medium text-[#172033]">{selectedFinding.code ?? "Not supplied"}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-[#667085]">Location</dt><dd className="mt-1 font-medium text-[#172033]">{selectedFinding.filePath ?? "Repository-level evidence"}{selectedFinding.lineStart ? `:${selectedFinding.lineStart}` : ""}</dd></div></dl><div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" onClick={() => void handleGeneratePatch()} disabled={patchLoading || Boolean(selectedFinding.diffContent)} className="rounded-lg bg-[#1264d8] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0b4da8] disabled:cursor-not-allowed disabled:opacity-50">{patchLoading ? "Generating patch..." : selectedFinding.diffContent ? "Patch generated" : "Generate patch"}</button>{selectedFinding.patchId && <button type="button" onClick={() => void handleRejectPatch()} disabled={rejectLoading || selectedFinding.status === "rejected"} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">{rejectLoading ? "Rejecting..." : selectedFinding.status === "rejected" ? "Patch rejected" : "Reject patch"}</button>}</div><div className="mt-5"><DiffViewer diff={selectedFinding.diffContent} /></div></div>}
    </section>
  );
}
