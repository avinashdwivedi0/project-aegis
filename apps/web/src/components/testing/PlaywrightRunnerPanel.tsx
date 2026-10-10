import { useState, type FormEvent } from "react";
import { Loader2, Play } from "lucide-react";

import { runPlaywrightFiles, type PlaywrightRun } from "@/services/playwright-runner";

export default function PlaywrightRunnerPanel({ repositoryId }: { repositoryId: string }) {
  const [testCaseId, setTestCaseId] = useState("REQ-TC-001");
  const [content, setContent] = useState("import { test, expect } from '@playwright/test';\n\ntest('example', async ({ page }) => {\n  await page.goto('http://localhost:5173');\n  await expect(page).toHaveTitle(/.+/);\n});");
  const [result, setResult] = useState<PlaywrightRun | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!repositoryId || loading) return;
    setLoading(true); setError(""); setResult(null);
    try {
      setResult(await runPlaywrightFiles({
        runId: `web-${Date.now()}`,
        repositoryId,
        files: [{ path: "tests/manual.spec.ts", language: "typescript", testCaseId: testCaseId.trim(), content }],
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Playwright suite could not be run.");
    } finally { setLoading(false); }
  }

  return <section className="rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
    <h2 className="font-semibold text-[#172033]">Run a Playwright script</h2>
    <p className="mt-1 text-sm text-[#667085]">The API uses the selected repository’s owned workspace. Script files are submitted to the isolated test runner.</p>
    {!repositoryId && <p className="mt-3 text-sm text-amber-800">Select a repository above to enable execution.</p>}
    <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-3">
      <label className="block text-sm font-medium text-[#344054]">Test case ID<input required pattern="REQ-TC-\d{3,}" value={testCaseId} onChange={(event) => setTestCaseId(event.target.value)} className="mt-1 w-full rounded-lg border border-[#dfe4eb] px-3 py-2" /></label>
      <label className="block text-sm font-medium text-[#344054]">Playwright TypeScript<textarea required value={content} onChange={(event) => setContent(event.target.value)} spellCheck={false} className="mt-1 min-h-64 w-full rounded-lg border border-[#dfe4eb] bg-[#101828] px-3 py-3 font-mono text-xs leading-5 text-white" /></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={!repositoryId || loading || !content.trim()} className="inline-flex items-center gap-2 rounded-lg bg-[#1264d8] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}{loading ? "Running tests…" : "Run Playwright test"}</button>
    </form>
    {result && <div className="mt-4 rounded-lg border border-[#edf0f4] p-4" aria-live="polite"><p className="font-semibold text-[#172033]">{result.status}: {result.passed} passed, {result.failed} failed, {result.skipped} skipped ({result.total} total)</p><ul className="mt-2 space-y-1 text-sm text-[#475467]">{result.tests.map((test, index) => <li key={`${test.title}-${index}`}>{test.status} · {test.title}{test.error ? ` — ${test.error}` : ""}</li>)}</ul>{(result.stdout || result.stderr) && <details className="mt-3"><summary className="cursor-pointer text-sm font-medium">Runner output</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs">{result.stdout}{result.stderr ? `\n${result.stderr}` : ""}</pre></details>}</div>}
  </section>;
}
