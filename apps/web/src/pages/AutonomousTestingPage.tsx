import axios from "axios";
import { CircleAlert, Code2, FlaskConical, Layers3, Loader2, Play, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { PageScaffold } from "@/components/ui/PageScaffold";
import { getProjects } from "@/services/project";
import { getRepositories } from "@/services/repository";
import { getAutonomousRunHistory, rerunInferredBlackBox, runInferredBlackBox, runIntegrationSuite, runLiveMode, runSecurityScan, runUnitSuite, type AutonomousRunHistoryItem, type BlackBoxRunResult, type BlackBoxRerunResult, type LiveRunModeResult, type LiveSecurityResult, type LiveSuiteResult } from "@/services/autonomous-testing";
import type { Project } from "@/types/project";
import type { Repository } from "@/types/repository";

function apiMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: unknown }>(error) && typeof error.response?.data?.message === "string") {
    return error.response.data.message;
  }
  return fallback;
}

function AutonomousTestingPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [projectId, setProjectId] = useState(localStorage.getItem("selectedProjectId") ?? "");
  const [repositoryId, setRepositoryId] = useState(localStorage.getItem("selectedRepositoryId") ?? "");
  const [frontendUrl, setFrontendUrl] = useState("");
  const [dashboardUrl, setDashboardUrl] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingRepositories, setLoadingRepositories] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BlackBoxRunResult | null>(null);
  const [regressionResult, setRegressionResult] = useState<BlackBoxRerunResult | null>(null);
  const [unitSuite, setUnitSuite] = useState<"password-helpers" | "exported-components">("exported-components");
  const [integrationSuite, setIntegrationSuite] = useState<"signup-login" | "new-order" | "dashboard-data">("signup-login");
  const [serviceBaseUrl, setServiceBaseUrl] = useState("");
  const [suiteResult, setSuiteResult] = useState<LiveSuiteResult | null>(null);
  const [runMode, setRunMode] = useState<LiveRunModeResult["mode"]>("smoke");
  const [runModeResult, setRunModeResult] = useState<LiveRunModeResult | null>(null);
  const [securityResult, setSecurityResult] = useState<LiveSecurityResult | null>(null);
  const [runHistory, setRunHistory] = useState<AutonomousRunHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const refreshRunHistory = useCallback(async () => {
    if (!repositoryId) { setRunHistory([]); return; }
    setLoadingHistory(true);
    setHistoryError("");
    try { setRunHistory(await getAutonomousRunHistory(repositoryId)); }
    catch (reason: unknown) { setHistoryError(apiMessage(reason, "Could not load saved run history.")); }
    finally { setLoadingHistory(false); }
  }, [repositoryId]);

  useEffect(() => {
    void getProjects().then(({ data }) => {
      setProjects(data);
      if (!data.some((project) => project.id === projectId)) {
        setProjectId(data[0]?.id ?? "");
      }
    }).catch((reason: unknown) => {
      setError(apiMessage(reason, "Could not load projects from the API."));
    }).finally(() => setLoadingProjects(false));
  // Initial project is loaded once; subsequent changes are explicit user selections.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!projectId) return;
    void getRepositories(projectId).then(({ data }) => {
      setRepositories(data);
      setRepositoryId((current) => data.some((repository) => repository.id === current)
        ? current
        : data[0]?.id ?? "");
    }).catch((reason: unknown) => {
      setError(apiMessage(reason, "Could not load repositories from the API."));
    }).finally(() => setLoadingRepositories(false));
  }, [projectId]);

  useEffect(() => {
    let active = true;
    void (async () => { await Promise.resolve(); if (active) await refreshRunHistory(); })();
    return () => { active = false; };
  }, [refreshRunHistory]);

  useEffect(() => {
    if (projectId) localStorage.setItem("selectedProjectId", projectId);
    if (repositoryId) localStorage.setItem("selectedRepositoryId", repositoryId);
  }, [projectId, repositoryId]);

  async function startBlackBoxRun() {
    if (!repositoryId || !frontendUrl || !dashboardUrl || running) return;
    setRunning(true);
    setError("");
    setResult(null);
    setRegressionResult(null);
    try {
      const output = await runInferredBlackBox({ repositoryId, frontendUrl, dashboardUrl });
      setResult(output);
      void refreshRunHistory();
    } catch (reason: unknown) {
      setError(apiMessage(reason, "The inferred black-box run could not be started."));
    } finally {
      setRunning(false);
    }
  }

  async function rerunBaseline() {
    if (!result || running) return;
    setRunning(true);
    setError("");
    setRegressionResult(null);
    try {
      setRegressionResult(await rerunInferredBlackBox({
        repositoryId: result.repository.id,
        baselineRunId: result.execution.runId,
      }));
      void refreshRunHistory();
    } catch (reason: unknown) {
      setError(apiMessage(reason, "The saved generated test could not be rerun."));
    } finally {
      setRunning(false);
    }
  }

  async function startSuite(kind: "unit" | "integration") {
    if (!repositoryId || running) return;
    setRunning(true);
    setError("");
    setSuiteResult(null);
    try {
      const output = kind === "unit"
        ? await runUnitSuite({ repositoryId, suite: unitSuite })
        : await runIntegrationSuite({ repositoryId, suite: integrationSuite, baseUrl: serviceBaseUrl });
      setSuiteResult(output);
      void refreshRunHistory();
    } catch (reason: unknown) {
      setError(apiMessage(reason, `The generated ${kind} suite could not be started.`));
    } finally {
      setRunning(false);
    }
  }

  async function startRunMode() {
    if (!repositoryId || running) return;
    setRunning(true);
    setError("");
    setRunModeResult(null);
    try {
      const output = await runLiveMode({
        repositoryId,
        mode: runMode,
        ...(frontendUrl ? { frontendUrl } : {}),
        ...(dashboardUrl ? { dashboardUrl } : {}),
        ...(serviceBaseUrl ? { integrationBaseUrl: serviceBaseUrl } : {}),
      });
      setRunModeResult(output);
      void refreshRunHistory();
    } catch (reason: unknown) {
      setError(apiMessage(reason, `The ${runMode} run could not be started.`));
    } finally {
      setRunning(false);
    }
  }

  async function startSecurityScan() {
    if (!repositoryId || running) return;
    setRunning(true);
    setError("");
    setSecurityResult(null);
    try { setSecurityResult(await runSecurityScan({ repositoryId })); void refreshRunHistory(); }
    catch (reason: unknown) { setError(apiMessage(reason, "The repository secret scan could not be started.")); }
    finally { setRunning(false); }
  }

  const selectedRepository = repositories.find((repository) => repository.id === repositoryId);

  return (
    <PageScaffold
      eyebrow="Autonomous test generation"
      title="Live repository tests"
      description="Select a repository, infer a supported flow from its source, generate the test, and execute it through the existing Playwright runner. Results below come from this live API run."
      icon={ShieldCheck}
      workspacePath="/testing"
    >
      <section className="rounded-xl border border-[#d8e5f5] bg-[#f0f6ff] p-4 text-sm text-[#344054]">
        <p className="flex items-center gap-2 font-semibold"><CircleAlert size={17} className="text-[#1264d8]" />Support boundary</p>
        <p className="mt-2">This live vertical slice supports the discovered MONGO_UR JavaScript/React patterns: password helpers and three exported UI components for unit checks; all eight discovered signup, login, order, holdings, positions, and forgot-password routes for integration checks; and the inferred signup/login browser flow. GET /addHoldings and GET /addPositions write seed rows, so run those checks only against a disposable target database. Other repositories need a matching generator before execution is available.</p>
      </section>

      <section className="grid gap-3 md:grid-cols-3" aria-label="Live capability status">
        <div className="rounded-xl border border-emerald-200 bg-white p-4"><p className="flex items-center gap-2 font-semibold text-[#172033]"><Code2 size={17} />Unit</p><p className="mt-2 text-sm text-emerald-800">Live sandbox generation and execution for supported source patterns</p></div>
        <div className="rounded-xl border border-emerald-200 bg-white p-4"><p className="flex items-center gap-2 font-semibold text-[#172033]"><Layers3 size={17} />Integration</p><p className="mt-2 text-sm text-emerald-800">Live checks for 8 discovered routes with per-suite coverage</p></div>
        <div className="rounded-xl border border-emerald-200 bg-white p-4"><p className="flex items-center gap-2 font-semibold text-[#172033]"><FlaskConical size={17} />Black-box</p><p className="mt-2 text-sm text-emerald-800">Live inferred-flow runner available</p></div>
        <div className="rounded-xl border border-emerald-200 bg-white p-4"><p className="flex items-center gap-2 font-semibold text-[#172033]"><ShieldCheck size={17} />Security</p><p className="mt-2 text-sm text-emerald-800">Source secret scan and root/nested lockfile audit; Semgrep uses repository rules</p></div>
      </section>

      <section className="rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
        <h2 className="font-semibold text-[#172033]">Infer and run a browser flow</h2>
        <p className="mt-1 text-sm text-[#667085]">The API reads the selected repository’s route and form source, creates a signup/login Playwright test, and runs it in the existing sandbox.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-[#344054]">Project
            <select value={projectId} onChange={(event) => { setProjectId(event.target.value); setLoadingRepositories(Boolean(event.target.value)); setRepositories([]); setRepositoryId(""); setResult(null); }} disabled={loadingProjects || running} className="mt-1 w-full rounded-lg border border-[#dfe4eb] bg-white px-3 py-2">
              <option value="">{loadingProjects ? "Loading projects…" : "Select project"}</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-[#344054]">Repository
            <select value={repositoryId} onChange={(event) => { setRepositoryId(event.target.value); setResult(null); }} disabled={!projectId || loadingRepositories || running} className="mt-1 w-full rounded-lg border border-[#dfe4eb] bg-white px-3 py-2">
              <option value="">{loadingRepositories ? "Loading repositories…" : "Select repository"}</option>
              {repositories.map((repository) => <option key={repository.id} value={repository.id}>{repository.name}{repository.status === "FAILED" ? " (failed)" : ""}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-[#344054]">Frontend URL
            <input type="url" value={frontendUrl} onChange={(event) => setFrontendUrl(event.target.value)} placeholder="http://host.docker.internal:3121" disabled={running} className="mt-1 w-full rounded-lg border border-[#dfe4eb] px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-[#344054]">Dashboard URL
            <input type="url" value={dashboardUrl} onChange={(event) => setDashboardUrl(event.target.value)} placeholder="http://host.docker.internal:3122" disabled={running} className="mt-1 w-full rounded-lg border border-[#dfe4eb] px-3 py-2" />
          </label>
        </div>
        {selectedRepository && selectedRepository.status === "FAILED" && <p className="mt-3 text-xs text-amber-800">This repository is marked failed; the API will explain if its workspace is missing.</p>}
        {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <button type="button" onClick={() => void startBlackBoxRun()} disabled={!repositoryId || !frontendUrl || !dashboardUrl || running} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1264d8] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          {running ? "Discovering and running…" : "Infer and run black-box flow"}
        </button>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#dfe4eb] bg-white p-5">
          <h2 className="font-semibold text-[#172033]">Generate and run unit checks</h2>
          <p className="mt-1 text-sm text-[#667085]">Discover supported declarations in the selected repository, then run their generated Node test in the sandbox.</p>
          <label className="mt-4 block text-sm font-medium text-[#344054]">Unit recipe
            <select value={unitSuite} onChange={(event) => setUnitSuite(event.target.value as typeof unitSuite)} disabled={running} className="mt-1 w-full rounded-lg border border-[#dfe4eb] bg-white px-3 py-2">
              <option value="exported-components">Exported React components (3 components)</option>
              <option value="password-helpers">Password helpers (hashPassword / verifyPassword)</option>
            </select>
          </label>
          <button type="button" onClick={() => void startSuite("unit")} disabled={!repositoryId || running} className="mt-4 rounded-lg bg-[#1264d8] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{running ? "Running…" : "Generate and run unit checks"}</button>
        </div>
        <div className="rounded-xl border border-[#dfe4eb] bg-white p-5">
          <h2 className="font-semibold text-[#172033]">Generate and run integration checks</h2>
          <p className="mt-1 text-sm text-[#667085]">Calls the real running service at this base URL. Use an isolated disposable database for state-changing runs.</p>
          <label className="mt-4 block text-sm font-medium text-[#344054]">Boundary
            <select value={integrationSuite} onChange={(event) => setIntegrationSuite(event.target.value as typeof integrationSuite)} disabled={running} className="mt-1 w-full rounded-lg border border-[#dfe4eb] bg-white px-3 py-2">
              <option value="signup-login">Signup and login</option>
              <option value="new-order">Create new order</option>
              <option value="dashboard-data">Holdings/positions seed + read routes and forgot-password</option>
            </select>
          </label>
          <label className="mt-3 block text-sm font-medium text-[#344054]">Running service base URL
            <input type="url" value={serviceBaseUrl} onChange={(event) => setServiceBaseUrl(event.target.value)} placeholder="http://host.docker.internal:3120" disabled={running} className="mt-1 w-full rounded-lg border border-[#dfe4eb] px-3 py-2" />
          </label>
          <button type="button" onClick={() => void startSuite("integration")} disabled={!repositoryId || !serviceBaseUrl || running} className="mt-4 rounded-lg bg-[#1264d8] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{running ? "Running…" : "Generate and run integration checks"}</button>
        </div>
      </section>

      {suiteResult && <section className="rounded-xl border border-[#dfe4eb] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-[#172033]">{suiteResult.type} · {suiteResult.suite}</h2><p className="mt-1 text-sm text-[#667085]">{suiteResult.runId} · {suiteResult.generatedTest.path}</p></div><span className={`rounded-full px-3 py-1 text-sm font-semibold ${suiteResult.failed === 0 && suiteResult.execution.status === "COMPLETED" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{suiteResult.passed} passed, {suiteResult.failed} failed, {suiteResult.skipped} skipped ({suiteResult.total} total)</span></div>
        {suiteResult.targetFiles && <p className="mt-3 text-sm text-[#475467]">Discovered targets: {suiteResult.targetFiles.map(({ file, targets }) => `${file} (${targets.map((target) => (target as { name: string }).name).join(", ")})`).join("; ")}</p>}
        {suiteResult.discoveredRoutes && <div className="mt-3 text-sm text-[#475467]"><p>Routes covered: {suiteResult.routeCoverage?.covered ?? suiteResult.discoveredRoutes.length}/{suiteResult.routeCoverage?.discovered ?? suiteResult.discoveredRoutes.length} · {suiteResult.discoveredRoutes.map(({ method, path, filePath, line }) => `${method} ${path} — ${filePath}:${line}`).join("; ")} · contract: {suiteResult.contractKind}</p>{Boolean(suiteResult.routeCoverage?.uncovered.length) && <p className="mt-1 text-amber-800">Not covered by this selected suite: {suiteResult.routeCoverage?.uncovered.join(", ")}</p>}</div>}
        <p className="mt-2 text-xs text-[#667085]">Container status: {suiteResult.execution.status} · exit {suiteResult.execution.exitCode ?? "none"} · {suiteResult.execution.durationMs}ms</p>
        <details className="mt-4 overflow-hidden rounded-lg border border-[#26354d] bg-[#101828]"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-white">Generated test and real runner output</summary><pre className="max-h-[34rem] overflow-auto border-t border-white/10 p-4 text-xs leading-5 text-[#e4e7ec]">{suiteResult.generatedTest.content}{"\n\n--- stdout ---\n"}{suiteResult.execution.stdout}{suiteResult.execution.stderr ? `\n--- stderr ---\n${suiteResult.execution.stderr}` : ""}</pre></details>
      </section>}

      <section className="rounded-xl border border-[#dfe4eb] bg-white p-5">
        <h2 className="font-semibold text-[#172033]">Run modes</h2>
        <p className="mt-1 text-sm text-[#667085]">The API selects from checks actually discovered for this repository. Sanity and Regression use its latest Git commit diff; System runs the full supported inventory and reports unsupported coverage gaps.</p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-64 text-sm font-medium text-[#344054]">Mode
            <select value={runMode} onChange={(event) => setRunMode(event.target.value as typeof runMode)} disabled={running} className="mt-1 w-full rounded-lg border border-[#dfe4eb] bg-white px-3 py-2">
              <option value="smoke">Smoke · critical paths</option>
              <option value="sanity">Sanity · latest commit changes</option>
              <option value="system">System · all supported checks</option>
              <option value="regression">Regression · previously passing affected checks</option>
              <option value="acceptance">Acceptance (UAT) · human requirement</option>
            </select>
          </label>
          <button type="button" onClick={() => void startRunMode()} disabled={!repositoryId || running} className="rounded-lg bg-[#1264d8] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{running ? "Selecting and running…" : "Run selected mode"}</button>
        </div>
      </section>

      {runModeResult && <section className="rounded-xl border border-[#dfe4eb] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold capitalize text-[#172033]">{runModeResult.mode} run · {runModeResult.repository.name}</h2><p className="mt-1 text-sm text-[#667085]">Latest commit files: {runModeResult.changedFiles.length ? runModeResult.changedFiles.join(", ") : "none or not required"}</p></div>{runModeResult.execution && <span className={`rounded-full px-3 py-1 text-sm font-semibold ${runModeResult.execution.totals.failed === 0 ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{runModeResult.execution.totals.passed} passed, {runModeResult.execution.totals.failed} failed ({runModeResult.execution.totals.selected} selected)</span>}</div>
        {runModeResult.acceptancePath && <p className="mt-3 text-sm text-[#475467]">{runModeResult.message} <a className="font-semibold text-[#1264d8] underline" href={runModeResult.acceptancePath}>Open Acceptance requirement workflow</a></p>}
        {runModeResult.selection.length > 0 && <div className="mt-4"><h3 className="text-sm font-semibold text-[#344054]">Selected checks</h3><ul className="mt-2 space-y-1 text-sm text-[#475467]">{runModeResult.selection.map((item) => <li key={item.id}>{item.type} · {item.suite} · {item.previousStatus} last status · {item.sourceFiles.join(", ")}</li>)}</ul></div>}
        {runModeResult.execution?.scheduled && <div className="mt-4"><h3 className="text-sm font-semibold text-[#344054]">Actual execution</h3><ul className="mt-2 space-y-2 text-sm text-[#475467]">{runModeResult.execution.scheduled.map((item) => { const security = item.result as Partial<LiveSecurityResult> | undefined; return <li key={item.descriptor.id} className="rounded-lg bg-[#f8fafc] p-3"><p className="font-medium">{item.status} · {item.descriptor.type} · {item.descriptor.suite ?? item.descriptor.id}</p>{item.error && <pre className="mt-2 whitespace-pre-wrap text-xs text-red-700">{item.error}</pre>}{security?.checks?.map((check) => <p key={check.name} className="mt-1 text-xs">{check.name}: {check.status}{check.coverage ? ` · ${check.coverage}` : ""}</p>)}{security?.coverageGaps?.map((gap) => <p key={gap} className="mt-1 text-xs text-amber-800">Coverage gap: {gap}</p>)}{security?.findings?.map((finding, index) => <p key={`${finding.filePath}-${finding.line}-${index}`} className="mt-1 text-xs text-red-700">{finding.ruleId} · {finding.filePath}{finding.line > 0 ? `:${finding.line}` : ""} · {finding.message}</p>)}</li>; })}</ul></div>}
        {runModeResult.gaps.length > 0 && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3"><h3 className="text-sm font-semibold text-amber-900">Coverage gaps</h3><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-900">{runModeResult.gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul></div>}
      </section>}

      <section className="rounded-xl border border-[#dfe4eb] bg-white p-5" aria-labelledby="autonomous-run-history-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 id="autonomous-run-history-title" className="font-semibold text-[#172033]">Saved run history</h2><p className="mt-1 text-sm text-[#667085]">Persisted results for this repository, newest first.</p></div>
          <button type="button" onClick={() => void refreshRunHistory()} disabled={!repositoryId || loadingHistory || running} className="rounded-lg border border-[#bfd6f8] px-3 py-2 text-sm font-semibold text-[#1264d8] disabled:opacity-50">{loadingHistory ? "Refreshing…" : "Refresh history"}</button>
        </div>
        {historyError && <p role="alert" className="mt-3 text-sm text-red-700">{historyError}</p>}
        {!historyError && !loadingHistory && runHistory.length === 0 && <p className="mt-3 text-sm text-[#667085]">No saved runs for this repository yet.</p>}
        {runHistory.length > 0 && <ul className="mt-4 divide-y divide-[#eaecf0]">{runHistory.map((run) => <li key={run.runId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
          <div><p className="font-medium capitalize text-[#344054]">{run.type}{run.suite ? ` · ${run.suite}` : ""}{run.mode ? ` · ${run.mode}` : ""} <span className="text-[#667085]">· {run.runId}</span></p><p className="mt-1 text-xs text-[#667085]">{new Date(run.createdAt).toLocaleString()} · {run.passed}/{run.total} passed · {run.failed} failed{run.generatedSourceAvailable ? " · generated source saved" : ""}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${run.status === "passed" ? "bg-emerald-50 text-emerald-800" : run.status === "failed" ? "bg-red-50 text-red-800" : run.status === "partial" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{run.status}</span>
        </li>)}</ul>}
        {runHistory.length === 100 && <p className="mt-2 text-xs text-[#667085]">Showing the 100 most recent runs.</p>}
      </section>

      <section className="rounded-xl border border-[#dfe4eb] bg-white p-5">
        <h2 className="font-semibold text-[#172033]">Repository security scans</h2>
        <p className="mt-1 text-sm text-[#667085]">Scans source files for secret patterns and runs npm/pnpm audit for root and nested lockfiles. Secret values are not copied into findings. Semgrep checks run when the selected run mode finds repository rules.</p>
        <button type="button" onClick={() => void startSecurityScan()} disabled={!repositoryId || running} className="mt-4 rounded-lg bg-[#1264d8] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{running ? "Scanning…" : "Run security scans"}</button>
        {securityResult && <div className={`mt-4 rounded-lg border p-4 text-sm ${securityResult.status === "failed" ? "border-red-200 bg-red-50 text-red-900" : securityResult.status === "partial" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
          <p className="font-semibold">{securityResult.status}: {securityResult.findingCount} findings across {securityResult.scannedFiles} source files · run {securityResult.runId}</p>
          <ul className="mt-2 space-y-1">{securityResult.checks.map((check) => <li key={check.name}>{check.name}: {check.status}{check.coverage ? ` · ${check.coverage}` : ""}{check.packages !== undefined ? ` · ${check.packages} advisories` : ""}</li>)}</ul>
          {securityResult.coverageGaps.map((gap) => <p key={gap} className="mt-2 text-amber-800">Coverage gap: {gap}</p>)}
          {securityResult.findings.map((finding, index) => <p key={`${finding.filePath}-${finding.line}-${index}`} className="mt-2">{finding.ruleId} · {finding.filePath}{finding.line > 0 ? `:${finding.line}` : ""} · {finding.message}</p>)}
        </div>}
      </section>

      {result && <section className="space-y-4 rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold text-[#172033]">{result.discoveredFlow.name}</h2><p className="mt-1 text-sm text-[#667085]">Discovered from {result.repository.name} · {result.generatedFile.path} · run {result.execution.runId}</p></div>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${result.execution.status === "passed" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{result.execution.status}: {result.execution.passed} passed, {result.execution.failed} failed</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg bg-[#f8fafc] p-4"><h3 className="text-sm font-semibold text-[#344054]">Source evidence</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#475467]">{result.discoveredFlow.sourceEvidence.map((item) => <li key={item}>{item}</li>)}</ul><p className="mt-3 text-xs text-[#667085]">Routes found: {result.discoveredFlow.frontendRoutes.join(", ")}</p></div>
          <div className="rounded-lg bg-[#f8fafc] p-4"><h3 className="text-sm font-semibold text-[#344054]">Execution details</h3><ul className="mt-2 space-y-1 text-sm text-[#475467]">{result.execution.tests.map((test, index) => <li key={`${test.title}-${index}`}>{test.status} · {test.title} · {test.durationMs}ms{test.error ? ` · ${test.error}` : ""}</li>)}</ul><p className="mt-3 text-xs text-[#667085]">{result.execution.total} total · {result.execution.durationMs}ms · {result.execution.resultsDirectory}</p></div>
        </div>
        <button type="button" onClick={() => void rerunBaseline()} disabled={running} className="inline-flex items-center gap-2 rounded-lg border border-[#bfd6f8] px-4 py-2 text-sm font-semibold text-[#1264d8] disabled:opacity-50">{running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}Rerun saved test (Regression)</button>
        {regressionResult && <div className={`rounded-lg border p-4 text-sm ${regressionResult.execution.status === "passed" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}><p className="font-semibold">Regression run {regressionResult.execution.status}: {regressionResult.execution.passed} passed, {regressionResult.execution.failed} failed</p><p className="mt-1">Reused generated test from {regressionResult.baselineRunId}; run {regressionResult.execution.runId}</p>{regressionResult.execution.tests.map((test, index) => <p key={`${test.title}-${index}`} className="mt-1">{test.status} · {test.title}{test.error ? ` · ${test.error}` : ""}</p>)}</div>}
        <details className="overflow-hidden rounded-lg border border-[#26354d] bg-[#101828]"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-white">View generated Playwright file</summary><pre className="max-h-[34rem] overflow-auto border-t border-white/10 p-4 text-xs leading-5 text-[#e4e7ec]"><code>{result.generatedFile.content}</code></pre></details>
      </section>}
    </PageScaffold>
  );
}

export default AutonomousTestingPage;
