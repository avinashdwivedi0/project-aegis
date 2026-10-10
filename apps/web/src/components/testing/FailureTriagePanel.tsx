import { useState, type FormEvent } from "react";
import { Loader2, WandSparkles } from "lucide-react";

import { triageFailures, type FailureTriageResult } from "@/services/failure-triage";

export default function FailureTriagePanel() {
  const [testCaseId, setTestCaseId] = useState("REQ-TC-001");
  const [message, setMessage] = useState("");
  const [stackTrace, setStackTrace] = useState("");
  const [result, setResult] = useState<FailureTriageResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await triageFailures([{ id: `failure-${Date.now()}`, testCaseId: testCaseId.trim(), message: message.trim(), stackTrace: stackTrace.trim() }]));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to classify this test failure.");
    } finally { setLoading(false); }
  }

  return <section className="rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
    <h2 className="font-semibold text-[#172033]">Triage a test failure</h2>
    <p className="mt-1 text-sm text-[#667085]">Classify a failed generated test as a product bug, locator change, flake, or environment issue.</p>
    <form onSubmit={(event) => void submit(event)} className="mt-4 grid gap-3">
      <label className="text-sm font-medium text-[#344054]">Test case ID<input required pattern="REQ-TC-\d{3,}" value={testCaseId} onChange={(event) => setTestCaseId(event.target.value)} className="mt-1 w-full rounded-lg border border-[#dfe4eb] px-3 py-2" /></label>
      <label className="text-sm font-medium text-[#344054]">Failure message<textarea required maxLength={10000} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-[#dfe4eb] px-3 py-2" /></label>
      <label className="text-sm font-medium text-[#344054]">Stack trace (optional)<textarea maxLength={20000} value={stackTrace} onChange={(event) => setStackTrace(event.target.value)} className="mt-1 min-h-24 w-full rounded-lg border border-[#dfe4eb] px-3 py-2" /></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={loading || !message.trim()} className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#1264d8] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={16} /> : <WandSparkles size={16} />}{loading ? "Classifying…" : "Classify failure"}</button>
    </form>
    {result && <div className="mt-4 rounded-lg bg-[#f8fafc] p-4" aria-live="polite"><h3 className="text-sm font-semibold text-[#344054]">Classification</h3>{result.groups.length === 0 ? <p className="mt-2 text-sm text-[#667085]">No failure groups returned.</p> : result.groups.map((group) => <div key={group.groupId} className="mt-2"><p className="font-medium capitalize text-[#172033]">{group.classification.replaceAll("_", " ")}</p><p className="text-sm text-[#667085]">{group.reasoning}</p></div>)}</div>}
  </section>;
}
