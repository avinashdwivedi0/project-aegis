import { AlertTriangle, CheckCircle2, CircleDot, Download, Loader2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { approvePatch, applyPatch, createPatchPullRequest, downloadAnalysisReport, generatePatch, getAnalysisScore, getFindings, getPatch, rejectPatch, validatePatch, type Finding } from "@/services/analysis";
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
  const [bridgeStatus, setBridgeStatus] = useState<"PENDING" | "COMPLETED" | "FAILED" | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [patchActionError, setPatchActionError] = useState("");
  const [patchActionMessage, setPatchActionMessage] = useState("");
  const [patchActionLoading, setPatchActionLoading] = useState(false);
  const [githubToken, setGithubToken] = useState("");
  const [pullRequestTitle, setPullRequestTitle] = useState("");
  const [pullRequestUrl, setPullRequestUrl] = useState("");

  // Poll bridge status until it leaves PENDING
  useEffect(() => {
    let active = true;
    let interval: ReturnType<typeof setInterval>;

    void (async () => {
      await Promise.resolve();
      if (!active) return;
      try {
        // Check bridge status via findings endpoint (includes bridgeStatus in response)
        const result = await getFindings(runId, {});
        if (!active) return;
        const firstFinding = result[0];
        if (firstFinding?.bridgeStatus && firstFinding.bridgeStatus !== "COMPLETED" && firstFinding.bridgeStatus !== "FAILED") {
          setBridgeStatus(firstFinding.bridgeStatus as "PENDING" | "COMPLETED" | "FAILED");
          setIsPolling(true);
          interval = setInterval(async () => {
            if (!active) return;
            try {
              const updated = await getFindings(runId, {});
              const f = updated[0];
              if (f?.bridgeStatus) {
                setBridgeStatus(f.bridgeStatus as "PENDING" | "COMPLETED" | "FAILED");
                setBridgeError(f.bridgeError ?? null);
              }
              if (f.bridgeStatus === "COMPLETED" || f.bridgeStatus === "FAILED") {
                setIsPolling(false);
                if (interval) clearInterval(interval);
              }
            } catch { /* ignore poll errors */ }
          }, 3000);
        } else if (firstFinding?.bridgeStatus) {
          setBridgeStatus(firstFinding.bridgeStatus as "PENDING" | "COMPLETED" | "FAILED");
          setBridgeError(firstFinding.bridgeError ?? null);
        }
      } catch { /* ignore */ }
    })();

    return () => { active = false; if (interval) clearInterval(interval); };
  }, [runId]);

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
        // Extract bridge status from first finding if available
        const firstFinding = nextFindings[0];
        if (firstFinding?.bridgeStatus) {
          setBridgeStatus(firstFinding.bridgeStatus as "PENDING" | "COMPLETED" | "FAILED");
          setBridgeError(firstFinding.bridgeError ?? null);
        }
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
    if (!selectedFinding?.repairFindingId || patchLoading) return;
    setPatchLoading(true);
    try {
      const patch = await generatePatch(selectedFinding.repairFindingId);
      setSelectedFinding({ ...selectedFinding, diffContent: patch.diffContent, patchId: patch.patchId, status: patch.lifecycle });
      setFindings((current) => current.map((finding) => finding.id === selectedFinding.id ? { ...finding, diffContent: patch.diffContent, patchId: patch.patchId, status: patch.lifecycle } : finding));
      setPatchActionError("");
    } catch {
      setPatchActionError("Could not generate a patch for this finding.");
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

  async function handleApprovePatch() {
    if (!selectedFinding?.patchId || patchActionLoading) return;
    setPatchActionLoading(true);
    setPatchActionError("");
    try {
      const result = await approvePatch(selectedFinding.patchId);
      setSelectedFinding({ ...selectedFinding, status: result.status });
      setFindings((current) => current.map((finding) => finding.id === selectedFinding.id ? { ...finding, status: result.status } : finding));
      setPatchActionMessage("Patch approved and ready for validation.");
    } catch {
      setPatchActionError("Could not approve this patch. Check whether it is eligible for approval.");
    } finally {
      setPatchActionLoading(false);
    }
  }

  async function handleRejectPatch() {
    if (!selectedFinding?.patchId || rejectLoading) return;
    setRejectLoading(true);
    try {
      await rejectPatch(selectedFinding.patchId);
      setSelectedFinding({ ...selectedFinding, status: "REJECTED" });
      setFindings((current) => current.map((finding) => finding.id === selectedFinding.id ? { ...finding, status: "REJECTED" } : finding));
      setPatchActionError("");
    } catch {
      setPatchActionError("Could not reject this patch. It may already have been validated or applied.");
    } finally {
      setRejectLoading(false);
    }
  }

  async function handleValidatePatch() {
    if (!selectedFinding?.patchId || patchActionLoading) return;
    if (selectedFinding.status !== "APPROVED") {
      setPatchActionError("This patch must be explicitly approved before validation can run.");
      return;
    }
    setPatchActionLoading(true);
    setPatchActionError("");
    try {
      const patch = await getPatch(selectedFinding.patchId);
      setSelectedFinding((current) => current ? { ...current, diffContent: patch.diffContent, status: patch.lifecycle } : current);
      const result = await validatePatch(selectedFinding.patchId);
      const lifecycle = result.patchLifecycle;
      setSelectedFinding({ ...selectedFinding, status: lifecycle });
      setFindings((current) => current.map((finding) => finding.id === selectedFinding.id ? { ...finding, status: lifecycle } : finding));
      setPatchActionMessage(lifecycle === "VALIDATED" ? "Patch validation passed." : "Validation completed and the patch was rejected.");
    } catch {
      setPatchActionError("Patch validation failed. Check that the repository workspace is available.");
    } finally { setPatchActionLoading(false); }
  }

  async function handleApplyPatch() {
    if (!selectedFinding?.patchId || patchActionLoading || !window.confirm("Apply this validated patch to the isolated workspace?")) return;
    setPatchActionLoading(true);
    setPatchActionError("");
    try {
      const result = await applyPatch(selectedFinding.patchId);
      if (!result.success) throw new Error(result.error || result.output);
      setSelectedFinding({ ...selectedFinding, status: "PATCH_APPLIED_IN_WORKSPACE" });
      setFindings((current) => current.map((finding) => finding.id === selectedFinding.id ? { ...finding, status: "PATCH_APPLIED_IN_WORKSPACE" } : finding));
      setPatchActionMessage(result.output || "Patch applied to the isolated workspace.");
      setPatchActionError("");
    } catch (reason) {
      setPatchActionError(reason instanceof Error ? reason.message : "Could not apply patch to the workspace.");
    } finally { setPatchActionLoading(false); }
  }

  async function handleCreatePullRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFinding?.patchId || patchActionLoading || !githubToken.trim() || !pullRequestTitle.trim()) return;
    setPatchActionLoading(true);
    setPatchActionError("");
    try {
      const result = await createPatchPullRequest(selectedFinding.patchId, githubToken.trim(), pullRequestTitle.trim(), `Generated repair patch for finding ${selectedFinding.id}.`);
      setPullRequestUrl(result.html_url ?? result.url ?? "");
      setGithubToken("");
    } catch {
      setPatchActionError("Could not create the pull request. Confirm the token has repository write access and the patch is validated.");
    } finally { setPatchActionLoading(false); }
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

      {bridgeStatus === "PENDING" && (
        <div className="py-4 text-sm text-blue-700 bg-blue-50 rounded-lg px-4 flex items-center gap-2">
          <Loader2 className="animate-spin" size={16} />
          <span>Repair bridge is being populated... (this may take a few seconds)</span>
        </div>
      )}
      {bridgeStatus === "FAILED" && (
        <div className="py-4 text-sm text-red-700 bg-red-50 rounded-lg px-4 flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>Repair bridge failed: {bridgeError ?? "Unknown error"}</span>
        </div>
      )}
      {bridgeStatus === "COMPLETED" && isPolling && (
        <div className="py-4 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-4 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>Repair bridge ready — patch actions available.</span>
        </div>
      )}

      {loading && <div className="flex items-center gap-2 py-8 text-sm text-[#667085]"><Loader2 className="animate-spin" size={17} /> Loading findings...</div>}
      {error && <p className="py-8 text-sm text-red-600">Unable to load findings for this run.</p>}
      {!loading && !error && findings.length === 0 && <p className="py-8 text-sm text-[#667085]">No findings match the selected filters.</p>}
      {!loading && !error && findings.length > 0 && !findings.some((f) => f.repairFindingId) && <div className="py-4 text-sm text-amber-700 bg-amber-50 rounded-lg px-4">Repair bridge not yet populated — patch actions are unavailable until the analysis run is bridged to the repair engine.</div>}
      {!loading && !error && findings.length > 0 && <div className="divide-y divide-[#edf0f4]">{findings.map((finding) => <button key={finding.id} type="button" onClick={() => setSelectedFinding(finding)} className="block w-full py-4 text-left first:pt-1 hover:bg-[#f8fafc]"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityStyles[finding.severity] ?? severityStyles.info}`}>{finding.severity}</span><span className="text-xs font-medium text-[#667085]">{finding.source}</span></div><p className="mt-2 font-medium text-[#172033]">{finding.message}</p><p className="mt-1 text-xs text-[#667085]">{finding.filePath ?? "Repository-level evidence"}{finding.lineStart ? `:${finding.lineStart}` : ""}{finding.code ? ` · ${finding.code}` : ""}</p></button>)}</div>}
      {selectedFinding && <div className="border-t border-[#dfe4eb] pt-5" role="dialog" aria-label="Finding details"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1264d8]">Finding details</p><h3 className="mt-2 text-lg font-semibold text-[#172033]">{selectedFinding.message}</h3></div><button type="button" onClick={() => setSelectedFinding(null)} aria-label="Close finding details" className="rounded-lg p-2 text-[#667085] hover:bg-[#edf0f4]"><X size={18} /></button></div><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-[#667085]">Severity</dt><dd className="mt-1 font-medium capitalize text-[#172033]">{selectedFinding.severity}</dd></div><div><dt className="text-xs text-[#667085]">Status</dt><dd className="mt-1 font-medium capitalize text-[#172033]">{selectedFinding.status}</dd></div><div><dt className="text-xs text-[#667085]">Source</dt><dd className="mt-1 font-medium text-[#172033]">{selectedFinding.source}</dd></div><div><dt className="text-xs text-[#667085]">Rule</dt><dd className="mt-1 font-medium text-[#172033]">{selectedFinding.code ?? "Not supplied"}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-[#667085]">Location</dt><dd className="mt-1 font-medium text-[#172033]">{selectedFinding.filePath ?? "Repository-level evidence"}{selectedFinding.lineStart ? `:${selectedFinding.lineStart}` : ""}</dd></div></dl><div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" onClick={() => void handleGeneratePatch()} disabled={patchLoading || Boolean(selectedFinding.patchId) || !selectedFinding.repairFindingId} className="rounded-lg bg-[#1264d8] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0b4da8] disabled:cursor-not-allowed disabled:opacity-50" title={!selectedFinding.repairFindingId ? "Bridge not ready" : undefined}>{patchLoading ? "Generating patch..." : selectedFinding.patchId ? "Patch generated" : !selectedFinding.repairFindingId ? "Bridge pending" : "Generate patch"}</button>{selectedFinding.patchId ? (
          <button type="button" onClick={() => void handleApprovePatch()} disabled={patchActionLoading || selectedFinding.status === "APPROVED"} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50" title={selectedFinding.status === "APPROVED" ? "Patch already approved" : "Approve patch before validation"}>
            {patchActionLoading ? "Approving..." : selectedFinding.status === "APPROVED" ? "Approved" : "Approve patch"}
          </button>
        ) : null}{selectedFinding.patchId && <><button type="button" onClick={() => void handleValidatePatch()} disabled={patchActionLoading || selectedFinding.status !== "APPROVED" || selectedFinding.status === "VALIDATED" || selectedFinding.status === "REJECTED"} className="rounded-lg border border-[#bfd6f8] px-3 py-2 text-sm font-semibold text-[#1264d8] disabled:opacity-50">{patchActionLoading ? "Working…" : selectedFinding.status === "APPROVED" ? "Validate patch" : "Approve before validation"}</button><button type="button" onClick={() => void handleApplyPatch()} disabled={patchActionLoading || selectedFinding.status !== "VALIDATED"} className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50">Apply to workspace</button><button type="button" onClick={() => void handleRejectPatch()} disabled={rejectLoading || ["REJECTED", "VALIDATED", "PATCH_APPLIED_IN_WORKSPACE"].includes(selectedFinding.status)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">{rejectLoading ? "Rejecting…" : "Reject patch"}</button></>}</div>{patchActionError && <p role="alert" className="mt-3 text-sm text-red-700">{patchActionError}</p>}{selectedFinding.patchId && selectedFinding.status === "VALIDATED" && <form onSubmit={(event) => void handleCreatePullRequest(event)} className="mt-4 grid gap-2 rounded-lg bg-[#f8fafc] p-4 sm:grid-cols-2"><label className="text-xs font-medium text-[#344054]">GitHub token<input type="password" autoComplete="off" value={githubToken} onChange={(event) => setGithubToken(event.target.value)} className="mt-1 w-full rounded border border-[#dfe4eb] px-2 py-2" required /></label><label className="text-xs font-medium text-[#344054]">Pull request title<input value={pullRequestTitle} onChange={(event) => setPullRequestTitle(event.target.value)} maxLength={200} className="mt-1 w-full rounded border border-[#dfe4eb] px-2 py-2" required /></label><button type="submit" disabled={patchActionLoading} className="rounded-lg bg-[#1264d8] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Create GitHub pull request</button></form>}{pullRequestUrl && <p className="mt-3 text-sm text-emerald-700">Pull request created: <a className="underline" href={pullRequestUrl} target="_blank" rel="noreferrer">Open pull request</a></p>}<div className="mt-5"><DiffViewer diff={selectedFinding.diffContent} /></div></div>}
      {patchActionMessage && <p role="status" className="text-sm text-emerald-700">{patchActionMessage}</p>}
    </section>
  );
}
