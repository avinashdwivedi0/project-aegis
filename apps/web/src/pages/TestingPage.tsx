import { Accessibility, Bug, FlaskConical, Gauge, KeyRound, Loader2, LockKeyhole, Network, PackageCheck, Play, TestTube2, Type } from "lucide-react";
import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { EmptyState, PageScaffold } from "@/components/ui/PageScaffold";
import { createAnalysis } from "@/services/analysis";
import { runGeneratedTestWorkflow, type GeneratedTestWorkflowResult } from "@/services/test-workflow";
import { getProjects } from "@/services/project";
import { getRepositories } from "@/services/repository";
import type { Repository } from "@/types/repository";

function TestingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAcceptanceMode = searchParams.get("mode") === "acceptance";
  const [projectId, setProjectId] = useState(searchParams.get("projectId") ?? localStorage.getItem("selectedProjectId") ?? "");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repositoryId, setRepositoryId] = useState(searchParams.get("repositoryId") ?? localStorage.getItem("selectedRepositoryId") ?? "");
  const testTypes = [
    ["typescript", "TypeScript", Type],
    ["python-syntax", "Python syntax", Type],
    ["eslint", "ESLint", Bug],
    ["dependency-audit", "Dependency audit", PackageCheck],
    ["security-scan", "Security scan", KeyRound],
    ["test-runner", "Functional tests", TestTube2],
    ["api-probe", "API probes", Network],
    ["browser-accessibility", "Browser/accessibility", Accessibility],
    ["performance", "Performance", Gauge],
  ] as const;
  const [selectedTools, setSelectedTools] = useState<string[]>(testTypes.map(([name]) => name));
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [requirement, setRequirement] = useState("");
  const [workflowRunning, setWorkflowRunning] = useState(false);
  const [workflowApproved, setWorkflowApproved] = useState(false);
  const [workflowResult, setWorkflowResult] = useState<GeneratedTestWorkflowResult | null>(null);

  useEffect(() => {
    if (projectId) return;
    void getProjects().then((response) => {
      setProjectId(response.data[0]?.id ?? "");
    }).catch(() => setError("Unable to load projects.")).finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    void getRepositories(projectId).then((response) => {
      setRepositories(response.data);
      setRepositoryId((current) => response.data.some((repository) => repository.id === current)
        ? current
        : response.data[0]?.id ?? "");
    }).catch(() => setError("Unable to load repositories.")).finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (projectId) localStorage.setItem("selectedProjectId", projectId);
    if (repositoryId) localStorage.setItem("selectedRepositoryId", repositoryId);
  }, [projectId, repositoryId]);

  async function handleRun() {
    if (!projectId || !repositoryId || running) return;
    setRunning(true);
    setError("");
    try {
      const run = await createAnalysis({
        projectId,
        repositoryId,
        adapters: selectedTools,
        ref: localStorage.getItem("defaultAnalysisRef") ?? "HEAD",
      });
      navigate(`/analysis?runId=${run.id}`);
    } catch (err: unknown) {
      const message = axios.isAxiosError<{ message?: unknown }>(err)
        && typeof err.response?.data?.message === "string"
        ? err.response.data.message
        : "Unable to start the validation run.";
      setError(message);
    } finally {
      setRunning(false);
    }
  }

  async function handleGeneratedWorkflow() {
    if (!projectId) {
      setError("Select a project first.");
      return;
    }
    if (!repositoryId) {
      setError("Select a repository first.");
      return;
    }
    if (!requirement.trim()) {
      setError("Enter a requirement before generating tests.");
      return;
    }
    if (workflowRunning) return;
    setWorkflowRunning(true);
    setError("");
    setWorkflowResult(null);
    try {
      if (!workflowApproved) {
        throw new Error("Workflow execution requires explicit human approval before running.");
      }

      const result = await runGeneratedTestWorkflow({
        projectId,
        repositoryId,
        requirement,
        parallelism: 2,
        approved: true,
      });
      setWorkflowResult(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Unable to generate and run the Playwright workflow: ${message}`);
    } finally {
      setWorkflowRunning(false);
    }
  }

  const cards = [
    [TestTube2, "Functional tests", "Run test suites and track pass rates."],
    [LockKeyhole, "Security checks", "Surface dependency and code-level risk."],
    [Gauge, "Performance", "Measure response time and resource pressure."],
  ] as const;

  return (
    <PageScaffold eyebrow={isAcceptanceMode ? "Acceptance (UAT)" : "Validation lab"} title={isAcceptanceMode ? "Acceptance testing" : "Testing"} description={isAcceptanceMode ? "Enter a human-written acceptance requirement and run it through the existing Playwright workflow." : "Coordinate functional, security, and performance checks from one focused workspace."} icon={FlaskConical}>
      <div className="grid gap-5 md:grid-cols-3">
        {cards.map(([Icon, label, detail]) => (
          <div key={label} className="rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
            <Icon className="text-[#1264d8]" size={20} />
            <h2 className="mt-4 font-semibold text-[#172033]">{label}</h2>
            <p className="mt-2 text-sm leading-6 text-[#667085]">{detail}</p>
          </div>
        ))}
      </div>
      {projectId && <section className="rounded-xl border border-[#bfd6f8] bg-[#f8fbff] p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-[#172033]">Requirement to Playwright test</h2><p className="mt-1 text-sm leading-6 text-[#667085]">Generate scenarios, design test cases, create a Playwright script, and execute it in the sandbox.</p></div><TestTube2 className="shrink-0 text-[#1264d8]" size={22} /></div><textarea value={requirement} onChange={(event) => {
          setRequirement(event.target.value);
          setWorkflowApproved(false);
        }} disabled={workflowRunning || !repositoryId} placeholder="Example: A user can reset their password using a verified email address." className="mt-4 min-h-28 w-full rounded-lg border border-[#dfe4eb] bg-white px-3 py-3 text-sm text-[#344054] outline-none focus:border-[#1264d8]" />
        <label className="mt-4 flex items-center gap-3 text-sm text-[#344054]">
          <input type="checkbox" checked={workflowApproved} onChange={(event) => setWorkflowApproved(event.target.checked)} />
          I approve this generated workflow for execution.
        </label>
        <button type="button" onClick={() => void handleGeneratedWorkflow()} disabled={!projectId || !repositoryId || !requirement.trim() || workflowRunning || !workflowApproved} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1264d8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b4da8] disabled:cursor-not-allowed disabled:opacity-50">{workflowRunning ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}{workflowRunning ? "Generating and running..." : "Generate and run Playwright"}</button>{workflowResult && <div className="mt-5 space-y-4"><div className={`rounded-lg border p-4 text-sm ${workflowResult.run.status === "passed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}><p className="font-semibold">Workflow {workflowResult.run.status}</p><p className="mt-1">{workflowResult.run.passed} passed · {workflowResult.run.failed} failed · {workflowResult.run.skipped} skipped · {workflowResult.scripts.files.length} script(s) generated</p></div><div className="grid gap-4 lg:grid-cols-3"><ReviewPanel title="Scenarios" items={workflowResult.scenarios.scenarios.map((item) => `${item.id} · ${item.title} · ${item.priority}`)} /><ReviewPanel title="Test cases" items={workflowResult.testCases.testCases.map((item) => `${item.id} · ${item.title} · ${item.steps.length} step(s)`)} /><ReviewPanel title="Playwright scripts" items={workflowResult.scripts.files.map((item) => `${item.testCaseId} · ${item.path}`)} /></div></div>}</section>}
      {!projectId && <EmptyState icon={FlaskConical} title="Choose a project first" description="Open Testing from a project workspace to configure a validation run." action="Open projects" onAction={() => window.location.assign("/projects")} />}
      {projectId && <section className="rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]"><label className="block text-sm font-semibold text-[#172033]" htmlFor="testing-repository">Repository</label><select id="testing-repository" value={repositoryId} onChange={(event) => setRepositoryId(event.target.value)} disabled={loading || running} className="mt-2 w-full rounded-lg border border-[#dfe4eb] bg-white px-3 py-2 text-sm text-[#344054]"><option value="">{loading ? "Loading repositories..." : "Select a repository"}</option>{repositories.map((repository) => <option key={repository.id} value={repository.id}>{repository.name}</option>)}</select><div className="mt-4 grid gap-2 sm:grid-cols-2">{testTypes.map(([name, label, Icon]) => <label key={name} className="flex items-center gap-2 rounded-lg border border-[#dfe4eb] px-3 py-2 text-sm text-[#344054]"><input type="checkbox" checked={selectedTools.includes(name)} onChange={() => setSelectedTools((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name])} /><Icon size={16} className="text-[#1264d8]" />{label}</label>)}</div>{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<button type="button" onClick={() => void handleRun()} disabled={!repositoryId || running || selectedTools.length === 0} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1264d8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b4da8] disabled:cursor-not-allowed disabled:opacity-50">{running ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />} {running ? "Starting run..." : "Run selected checks"}</button></section>}
    </PageScaffold>
  );
}

function ReviewPanel({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-lg border border-[#dfe4eb] bg-white p-3"><h3 className="text-sm font-semibold text-[#172033]">{title}</h3><ul className="mt-2 space-y-2 text-xs leading-5 text-[#667085]">{items.map((item) => <li key={item} className="rounded border border-[#edf0f4] px-2 py-2">{item}</li>)}</ul></div>;
}

export default TestingPage;
