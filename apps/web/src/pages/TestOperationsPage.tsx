import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState, PageScaffold } from "@/components/ui/PageScaffold";
import { getProjects } from "@/services/project";
import { getRepositories } from "@/services/repository";
import { getTestReport, type TestReport } from "@/services/test-report";
import FailureTriagePanel from "@/components/testing/FailureTriagePanel";
import PlaywrightRunnerPanel from "@/components/testing/PlaywrightRunnerPanel";
import type { Project } from "@/types/project";
import type { Repository } from "@/types/repository";

function TestOperationsPage() {
  const [report, setReport] = useState<TestReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repositoryId, setRepositoryId] = useState("");

  useEffect(() => {
    let active = true;
    void getProjects().then((response) => {
      if (active) setProjects(response.data);
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    void getRepositories(projectId).then((response) => {
      if (!active) return;
      setRepositories(response.data);
      setRepositoryId((current) => response.data.some((item) => item.id === current) ? current : "");
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    if (!repositoryId) return;
    let active = true;
    void getTestReport(repositoryId).then((nextReport) => { if (active) setReport(nextReport); })
      .catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [repositoryId]);

  const latest = report?.runHistory.at(-1);

  return (
    <PageScaffold
      eyebrow="Test operations"
      title="Test Intelligence"
      description="Track Playwright reliability, execution speed, and release readiness from recorded test runs."
      icon={Activity}
    >
      <FailureTriagePanel />
      <section className="grid gap-4 rounded-xl border border-[#dfe4eb] bg-white p-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-[#344054]">Project<select value={projectId} onChange={(event) => { setProjectId(event.target.value); setRepositories([]); setRepositoryId(""); setReport(null); setLoading(true); setError(false); }} className="mt-2 w-full rounded-lg border border-[#dfe4eb] bg-white px-3 py-2"><option value="">Select a project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label className="text-sm font-medium text-[#344054]">Repository<select value={repositoryId} onChange={(event) => { setRepositoryId(event.target.value); setReport(null); setLoading(Boolean(event.target.value)); setError(false); }} disabled={!projectId} className="mt-2 w-full rounded-lg border border-[#dfe4eb] bg-white px-3 py-2"><option value="">Select a repository</option>{repositories.map((repository) => <option key={repository.id} value={repository.id}>{repository.name}</option>)}</select></label>
      </section>
      {repositoryId && <PlaywrightRunnerPanel repositoryId={repositoryId} />}
      {loading && (
        <div className="flex items-center gap-2 rounded-xl border border-[#dfe4eb] bg-white p-8 text-sm text-[#667085]">
          <Loader2 className="animate-spin" size={18} /> Loading test intelligence...
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Unable to load test operations data.
        </div>
      )}
      {!loading && !error && (!report || report.runHistory.length === 0) && (
        <EmptyState
          icon={Activity}
          title="No test runs yet"
          description="Generate and run an approved Playwright test suite to populate this dashboard. This view will remain here while results are unavailable."
        />
      )}
      {!loading && !error && report && report.runHistory.length > 0 && (
        <div className="space-y-6">
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Metric title="Latest pass rate" value={`${Math.round((latest?.passRate ?? 0) * 100)}%`} icon={CheckCircle2} />
            <Metric title="Recorded runs" value={String(report.runHistory.length)} icon={Activity} />
            <Metric title="Flaky tests" value={String(report.flakyTests.length)} icon={AlertTriangle} />
            <Metric title="Readiness score" value={`${report.releaseReadiness.score}/100`} icon={ShieldCheck} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Panel title="Pass-rate trend" icon={Activity}>
              <div className="space-y-3">
                {report.passRateTrend.map((run) => (
                  <div key={run.runId}>
                    <div className="mb-1 flex justify-between text-xs text-[#667085]">
                      <span>{new Date(run.createdAt).toLocaleString()}</span>
                      <span>{Math.round(run.passRate * 100)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#edf0f4]">
                      <div className="h-2 rounded-full bg-[#1264d8]" style={{ width: `${Math.max(0, Math.min(100, run.passRate * 100))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Release readiness" icon={ShieldCheck}>
              <div className={`rounded-xl p-4 ${report.releaseReadiness.ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                <p className="font-semibold">{report.releaseReadiness.ready ? "Ready for release" : "Review required"}</p>
                {report.releaseReadiness.reasons.length > 0 && <ul className="mt-2 space-y-1 text-sm">{report.releaseReadiness.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <ListPanel title="Flaky tests" icon={AlertTriangle} empty="No flaky tests detected." items={report.flakyTests.map((test) => `${test.title} · ${Math.round(test.failureRate * 100)}% failure rate`)} />
            <ListPanel title="Slow tests" icon={Clock3} empty="No test duration data available." items={report.slowTests.map((test) => `${test.title} · ${Math.round(test.averageDurationMs)} ms average`)} />
          </section>
        </div>
      )}
    </PageScaffold>
  );
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: typeof Activity }) {
  return <div className="rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]"><Icon className="text-[#1264d8]" size={20} /><p className="mt-4 text-2xl font-semibold text-[#172033]">{value}</p><p className="mt-1 text-sm text-[#667085]">{title}</p></div>;
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Activity; children: React.ReactNode }) {
  return <section className="rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]"><div className="mb-5 flex items-center gap-3"><Icon className="text-[#1264d8]" size={20} /><h2 className="font-semibold text-[#172033]">{title}</h2></div>{children}</section>;
}

function ListPanel({ title, icon: Icon, empty, items }: { title: string; icon: typeof Activity; empty: string; items: string[] }) {
  return <Panel title={title} icon={Icon}>{items.length === 0 ? <p className="text-sm text-[#667085]">{empty}</p> : <ul className="space-y-3 text-sm text-[#344054]">{items.map((item) => <li key={item} className="rounded-lg border border-[#edf0f4] px-3 py-3">{item}</li>)}</ul>}</Panel>;
}

export default TestOperationsPage;
