import { Accessibility, Bug, FlaskConical, Gauge, KeyRound, Loader2, LockKeyhole, Network, PackageCheck, Play, TestTube2, Type } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { EmptyState, PageScaffold } from "@/components/ui/PageScaffold";
import { createAnalysis } from "@/services/analysis";
import { getProjects } from "@/services/project";
import { getRepositories } from "@/services/repository";
import type { Repository } from "@/types/repository";

function TestingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projectId, setProjectId] = useState(searchParams.get("projectId") ?? localStorage.getItem("selectedProjectId") ?? "");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repositoryId, setRepositoryId] = useState("");
  const testTypes = [
    ["typescript", "TypeScript", Type],
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
      setRepositoryId(response.data[0]?.id ?? "");
    }).catch(() => setError("Unable to load repositories.")).finally(() => setLoading(false));
  }, [projectId]);

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
    } catch {
      setError("Unable to start the validation run.");
    } finally {
      setRunning(false);
    }
  }

  const cards = [
    [TestTube2, "Functional tests", "Run test suites and track pass rates."],
    [LockKeyhole, "Security checks", "Surface dependency and code-level risk."],
    [Gauge, "Performance", "Measure response time and resource pressure."],
  ] as const;

  return (
    <PageScaffold eyebrow="Validation lab" title="Testing" description="Coordinate functional, security, and performance checks from one focused workspace." icon={FlaskConical}>
      <div className="grid gap-5 md:grid-cols-3">
        {cards.map(([Icon, label, detail]) => (
          <div key={label} className="rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
            <Icon className="text-[#1264d8]" size={20} />
            <h2 className="mt-4 font-semibold text-[#172033]">{label}</h2>
            <p className="mt-2 text-sm leading-6 text-[#667085]">{detail}</p>
          </div>
        ))}
      </div>
      {!projectId && <EmptyState icon={FlaskConical} title="Choose a project first" description="Open Testing from a project workspace to configure a validation run." action="Open projects" onAction={() => window.location.assign("/projects")} />}
      {projectId && <section className="rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]"><label className="block text-sm font-semibold text-[#172033]" htmlFor="testing-repository">Repository</label><select id="testing-repository" value={repositoryId} onChange={(event) => setRepositoryId(event.target.value)} disabled={loading || running} className="mt-2 w-full rounded-lg border border-[#dfe4eb] bg-white px-3 py-2 text-sm text-[#344054]"><option value="">{loading ? "Loading repositories..." : "Select a repository"}</option>{repositories.map((repository) => <option key={repository.id} value={repository.id}>{repository.name}</option>)}</select><div className="mt-4 grid gap-2 sm:grid-cols-2">{testTypes.map(([name, label, Icon]) => <label key={name} className="flex items-center gap-2 rounded-lg border border-[#dfe4eb] px-3 py-2 text-sm text-[#344054]"><input type="checkbox" checked={selectedTools.includes(name)} onChange={() => setSelectedTools((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name])} /><Icon size={16} className="text-[#1264d8]" />{label}</label>)}</div>{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<button type="button" onClick={() => void handleRun()} disabled={!repositoryId || running || selectedTools.length === 0} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1264d8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b4da8] disabled:cursor-not-allowed disabled:opacity-50">{running ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />} {running ? "Starting run..." : "Run selected checks"}</button></section>}
    </PageScaffold>
  );
}

export default TestingPage;