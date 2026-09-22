import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import {
  getAnalysisEvents,
  getAnalysisRun,
  retryAnalysis,
  type AnalysisEvent,
  type AnalysisRun,
} from "@/services/analysis";

const terminalStates = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

export default function AnalysisProgress({ runId }: { runId: string }) {
  const [run, setRun] = useState<AnalysisRun | null>(null);
  const [events, setEvents] = useState<AnalysisEvent[]>([]);
  const [error, setError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
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
  if (!run) return <section className="flex items-center gap-2 rounded-xl border border-[#dfe4eb] bg-white p-5 text-sm text-[#667085]"><Loader2 className="animate-spin" size={17} /> Loading analysis progress...</section>;

  const isComplete = run.status === "COMPLETED";
  const isFailed = run.status === "FAILED" || run.status === "CANCELLED";

  async function handleRetry() {
    if (retrying) return;
    setRetrying(true);
    try {
      await retryAnalysis(runId);
      setRun(null);
      setRefreshKey((current) => current + 1);
    } finally {
      setRetrying(false);
    }
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
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#edf0f4]"><div className="h-full rounded-full bg-[#1264d8] transition-all" style={{ width: `${run.progress}%` }} /></div>
      <div className="mt-2 flex justify-between text-xs text-[#667085]"><span>{run.status}</span><span>{run.progress}%</span></div>
      {!pollingEnabled && !terminalStates.has(run.status) && <p className="mt-4 text-xs text-[#667085]">Live polling is paused in Settings.</p>}
      {run.error && <p className="mt-4 text-sm text-red-600">{run.error}</p>}
      {isFailed && <button type="button" onClick={() => void handleRetry()} disabled={retrying} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#bfd6f8] px-3 py-2 text-sm font-semibold text-[#1264d8] hover:bg-[#f3f7fd] disabled:opacity-50">{retrying ? "Retrying..." : "Retry analysis"}</button>}
      {events.length > 0 && <div className="mt-5 border-t border-[#edf0f4] pt-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#667085]">Recent events</p><div className="mt-3 space-y-2">{events.slice(-4).reverse().map((event) => <p key={event.id} className="text-sm text-[#344054]">{event.message ?? event.stage ?? event.type}</p>)}</div></div>}
    </section>
  );
}
