import { CheckCircle2, CircleAlert, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import {
  getAnalysisEvents,
  getAnalysisRun,
  getAnalysisSummary,
  getMergeGate,
  getFindings,
  cancelAnalysis,
  retryAnalysis,
  type AnalysisEvent,
  type AnalysisRun,
  type AnalysisRunSummaryDetail,
  type MergeGateResult,
  type Finding,
} from "@/services/analysis";

const terminalStates = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

const AGENT_ORDER = [
  "codeQuality",
  "security",
  "dependency",
  "test",
  "api",
  "ui",
  "performance",
  "report",
] as const;

type AgentKey = typeof AGENT_ORDER[number];

type AgentStatus = "pending" | "active" | "completed" | "findings" | "skipped" | "failed" | "unknown";

function deriveAgentStatuses(events: AnalysisEvent[]): Record<AgentKey, AgentStatus> {
  const statuses: Record<AgentKey, AgentStatus> = {
    codeQuality: "pending",
    security: "pending",
    dependency: "pending",
    test: "pending",
    api: "pending",
    ui: "pending",
    performance: "pending",
    report: "pending",
  };

  for (const event of events) {
    const role = event.agentRole as AgentKey | undefined;
    if (!role || !AGENT_ORDER.includes(role)) continue;

    if (event.type === "AGENT_STARTED") {
      statuses[role] = "active";
    } else if (event.type === "AGENT_COMPLETED") {
      statuses[role] = "completed";
    } else if (event.type === "AGENT_SKIPPED") {
      statuses[role] = "skipped";
    } else if (event.type === "AGENT_FAILED") {
      statuses[role] = "failed";
    }
  }

  return statuses;
}

function formatAgentName(key: AgentKey): string {
  const labels: Record<AgentKey, string> = {
    codeQuality: "Code Quality",
    security: "Security",
    dependency: "Dependencies",
    test: "Test Coverage",
    api: "API Contracts",
    ui: "UI Accessibility",
    performance: "Performance",
    report: "Report",
  };
  return labels[key] ?? key;
}

function getStatusIcon(status: AgentStatus) {
  switch (status) {
    case "pending":
      return <span className="w-4 h-4 rounded-full border border-[#dfe4eb] bg-white" />;
    case "active":
      return <Loader2 size={14} className="animate-spin text-[#1264d8]" />;
    case "completed":
      return <CheckCircle2 size={14} className="text-emerald-600" />;
    case "failed":
      return <CircleAlert size={14} className="text-red-600" />;
    case "skipped":
      return <CircleAlert size={14} className="text-amber-600" />;
    case "findings":
      return <CircleAlert size={14} className="text-amber-600" />;
    case "unknown":
      return <CircleAlert size={14} className="text-slate-400" />;
  }
}

export default function AnalysisProgress({ runId }: { runId: string }) {
  const [run, setRun] = useState<AnalysisRun | null>(null);
  const [events, setEvents] = useState<AnalysisEvent[]>([]);
  const [error, setError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [summary, setSummary] = useState<AnalysisRunSummaryDetail | null>(null);
  const [checkFindings, setCheckFindings] = useState<Finding[]>([]);
  const [gate, setGate] = useState<MergeGateResult | null>(null);
  const [actionError, setActionError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const pollingEnabled = localStorage.getItem("analysisPolling") !== "off";

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    const load = async () => {
      try {
        const [nextRun, nextEvents] = await Promise.all([
          getAnalysisRun(runId),
          getAnalysisEvents(runId),
        ]);
        if (!active) return;
        setRun(nextRun);
        setEvents(nextEvents);
        const [summaryResult, gateResult] = await Promise.allSettled([
          getAnalysisSummary(runId),
          getMergeGate(runId),
        ]);
        if (!active) return;
        if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
        if (gateResult.status === "fulfilled") setGate(gateResult.value);
        const findingsResult = await getFindings(runId, {});
        if (active) setCheckFindings(findingsResult);
        if (pollingEnabled && !terminalStates.has(nextRun.status)) {
          timer = window.setTimeout(load, 2000);
        }
      } catch {
        if (active) setError(true);
      }
    };

    void load();
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [pollingEnabled, refreshKey, runId]);

  if (error) return <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">Unable to load analysis progress.</section>;
  if (!run) return <section className="flex items-center gap-2 rounded-xl border border-[#dfe4eb] bg-white p-5 text-sm text-[#667085]"><Loader2 size={17} className="animate-spin" /> Loading analysis progress...</section>;

  const agentStatuses = deriveAgentStatuses(events);
  const checkToAgent: Record<string, AgentKey> = {
    typescript: "codeQuality", "python-syntax": "codeQuality", eslint: "codeQuality",
    "security-scan": "security", "dependency-audit": "dependency", "test-runner": "test",
    "api-probe": "api", "browser-accessibility": "ui", performance: "performance",
  };
  const statusPriority: Record<AgentStatus, number> = { pending: 0, active: 1, completed: 2, findings: 3, skipped: 4, failed: 5, unknown: 0 };
  for (const [tool, result] of Object.entries(summary?.tools ?? {})) {
    const agent = checkToAgent[tool];
    if (!agent) continue;
    const normalized: AgentStatus = result.status === "PASSED" || result.status === "COMPLETED" ? "completed"
      : result.status === "FINDINGS" ? "findings"
      : result.status === "FAILED" || result.status === "TIMED_OUT" ? "failed"
      : result.status === "SKIPPED" ? "skipped" : "unknown";
    if (statusPriority[normalized] > statusPriority[agentStatuses[agent]]) agentStatuses[agent] = normalized;
  }
  const agentToolNames: Record<AgentKey, string> = {
    codeQuality: "agent:code-quality",
    security: "agent:security",
    dependency: "agent:dependency",
    test: "agent:test",
    api: "agent:api",
    ui: "agent:ui-accessibility",
    performance: "agent:performance",
    report: "agent:report",
  };
  for (const key of AGENT_ORDER) {
    const result = summary?.tools[agentToolNames[key]];
    if (result) {
      const status = result.status.toUpperCase();
      agentStatuses[key] = status === "SKIPPED"
        ? "skipped"
        : status === "FAILED"
          ? "failed"
          : status === "FINDINGS"
            ? "findings"
            : status === "PASSED"
              ? "completed"
              : agentStatuses[key];
    }
  }
  const isComplete = run.status === "COMPLETED";
  const isFailed = run.status === "FAILED" || run.status === "CANCELLED";

  async function handleRetry() {
    if (retrying) return;
    setRetrying(true);
    try {
      await retryAnalysis(runId);
      setActionError("");
      setRun(null);
      setRefreshKey((current) => current + 1);
    } catch {
      setActionError("Could not retry this analysis run.");
    } finally {
      setRetrying(false);
    }
  }

  async function handleCancel() {
    if (cancelling) return;
    setCancelling(true);
    setActionError("");
    try {
      setRun(await cancelAnalysis(runId));
      setRefreshKey((current) => current + 1);
    } catch {
      setActionError("Could not cancel this run. It may already have finished.");
    } finally { setCancelling(false); }
  }

  return (
    <section className="rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1264d8]">Live run</p>
          <h2 className="mt-1 text-xl font-semibold text-[#172033]">Analysis progress</h2>
          <p className="mt-1 text-sm text-[#667085]">{run.currentStage ?? (run.status === "PENDING" ? "Waiting for worker" : "Preparing run")}</p>
        </div>
        {isComplete ? <CheckCircle2 className="text-emerald-600" /> : isFailed ? <CircleAlert className="text-red-600" /> : <Loader2 className="animate-spin text-[#1264d8]" />}
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#edf0f4]">
        <div className="h-full rounded-full bg-[#1264d8] transition-all" style={{ width: `${run.progress}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-[#667085]"><span>{run.status}</span><span>{run.progress}%</span></div>
      {!pollingEnabled && !terminalStates.has(run.status) && <p className="mt-4 text-xs text-[#667085]">Live polling is paused in Settings.</p>}
      {run.error && <p className="mt-4 text-sm text-red-600">{run.error}</p>}
      {actionError && <p role="alert" className="mt-3 text-sm text-red-700">{actionError}</p>}

      <div className={`mt-4 rounded-lg border p-3 text-sm ${gate?.allowed ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
        <p className="font-semibold">Merge gate {gate ? (gate.allowed ? "passed" : "blocked") : "unavailable"}</p>
        <p className="mt-1">{gate?.reason ?? "Merge gate status could not be loaded."} · {gate?.findings ?? 0} high or critical finding(s)</p>
      </div>
      {summary && <section className="mt-4 rounded-lg border border-[#edf0f4] p-4"><h2 className="text-sm font-semibold text-[#344054]">Selected check results</h2><p className="mt-1 text-xs text-[#667085]">{summary.totals.executions - summary.totals.skipped - summary.totals.failed} ran · {summary.totals.skipped} skipped · {summary.totals.failed} failed · {summary.totals.findings} findings</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{Object.entries(summary.tools).map(([tool, result]) => {
        const badgeClass = result.status === "PASSED" || result.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : result.status === "FINDINGS" ? "bg-amber-50 text-amber-800" : result.status === "SKIPPED" ? "bg-slate-100 text-slate-700" : "bg-red-50 text-red-700";
        const findings = checkFindings.filter((finding) => finding.source === tool && finding.filePath && finding.lineStart);
        return <details key={tool} className="rounded-lg border border-[#edf0f4] p-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm"><span className="font-medium text-[#344054]">{tool} · {result.findings} finding(s)</span><span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClass}`}>{result.status}</span></summary><p className="mt-2 text-xs text-[#667085]">Projects scanned: {result.projectsScanned}</p>{result.reason && <p className="mt-2 text-xs text-red-700">{result.reason}</p>}{tool === "test-runner" && result.status === "SKIPPED" && <p className="mt-2 text-xs text-[#475467]">No repository test script was available. You can choose a supported unit, integration, or black-box generator on the <a className="font-semibold text-[#1264d8] underline" href="/autonomous-testing">Autonomous Testing page</a>.</p>}{findings.length > 0 && <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="text-[#667085]"><th className="pr-3">File:line</th><th className="pr-3">Rule</th><th className="pr-3">Severity</th><th>Message</th></tr></thead><tbody>{findings.map((finding) => <tr key={finding.id} className="border-t border-[#edf0f4] align-top"><td className="whitespace-nowrap pr-3 py-2">{finding.filePath}:{finding.lineStart}</td><td className="pr-3 py-2">{finding.code ?? "—"}</td><td className="pr-3 py-2">{finding.severity}</td><td className="py-2">{finding.message}</td></tr>)}</tbody></table></div>}{findings.length === 0 && result.status === "FINDINGS" && result.output && <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-[#f8fafc] p-3 text-xs text-[#475467]">{result.output}</pre>}{findings.length === 0 && result.reason == null && result.status !== "FINDINGS" && <p className="mt-2 text-xs text-[#667085]">No file-level findings.</p>}</details>;
      })}</div><p className="mt-3 text-xs text-[#667085]">Severity counts: {Object.entries(summary.bySeverity).map(([level, count]) => `${level} ${count}`).join(" · ") || "none"}</p></section>}

      {/* Agent Status Grid */}
      <div className="mt-5 pt-5 border-t border-[#edf0f4]">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#667085]">Agent pipeline</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          {AGENT_ORDER.map((key) => {
            const status = agentStatuses[key];
            const isActive = status === "active";
            return (
              <div
                key={key}
                className={`relative rounded-xl p-4 border text-center transition-colors ${
                  isActive
                    ? "border-[#1264d8] bg-[#f3f7fd]"
                    : status === "completed"
                    ? "border-emerald-200 bg-emerald-50"
                    : status === "failed"
                    ? "border-red-200 bg-red-50"
                    : status === "skipped"
                    ? "border-amber-200 bg-amber-50"
                    : status === "findings"
                    ? "border-amber-200 bg-amber-50"
                    : "border-[#dfe4eb] bg-white"
                }`}
              >
                <div className="flex justify-center mb-2">{getStatusIcon(status)}</div>
                <p className="text-sm font-medium text-[#172033]">{formatAgentName(key)}</p>
                <p className={`mt-1 text-xs font-medium ${
                  status === "pending" ? "text-[#98a2b3]" :
                  status === "active" ? "text-[#1264d8]" :
                  status === "completed" ? "text-emerald-700" :
                  status === "skipped" || status === "findings" ? "text-amber-700" :
                  status === "unknown" ? "text-slate-500" : "text-red-700"
                }`}>
                  {status === "pending" && "Waiting"}
                  {status === "active" && "Running"}
                  {status === "completed" && "Done"}
                  {status === "findings" && "Findings"}
                  {status === "skipped" && "Skipped"}
                  {status === "failed" && "Failed"}
                  {status === "unknown" && "Status unavailable"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Log */}
      {events.length > 0 && (
        <div className="mt-5 pt-4 border-t border-[#edf0f4]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#667085]">Recent events</p>
          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
            {events.slice(-8).reverse().map((event) => (
              <p
                key={event.id}
                className={`text-sm text-[#344054] font-mono ${
                  event.type.startsWith("AGENT_") ? "text-[#1264d8]" : ""
                }`}
              >
                {event.agentRole ? `[${event.agentRole}] ` : ""}{event.message ?? event.stage ?? event.type}
              </p>
            ))}
          </div>
        </div>
      )}

      {isFailed && (
        <button
          type="button"
          onClick={() => void handleRetry()}
          disabled={retrying}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#bfd6f8] px-3 py-2 text-sm font-semibold text-[#1264d8] hover:bg-[#f3f7fd] disabled:opacity-50"
        >
          {retrying ? "Retrying..." : "Retry analysis"}
        </button>
      )}
      {!terminalStates.has(run.status) && <button type="button" onClick={() => void handleCancel()} disabled={cancelling} className="mt-3 ml-2 inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"><XCircle size={15} />{cancelling ? "Cancelling…" : "Cancel run"}</button>}
    </section>
  );
}
