import { useCallback, useEffect, useState } from "react";

import { Copy, Download, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { getProjects } from "@/services/project";
import { getRepositories } from "@/services/repository";
import { generateCiConfig, type CiConfigGenerateInput, type CiConfigResult } from "@/services/ci-integration";

import type { Project } from "@/types/project";
import type { Repository } from "@/types/repository";

const PLATFORMS = [
  { id: "github" as const, label: "GitHub Actions", ext: "yml", path: ".github/workflows/aegis-analysis.yml" },
  { id: "gitlab" as const, label: "GitLab CI", ext: "yml", path: ".gitlab-ci.yml" },
  { id: "azure" as const, label: "Azure Pipelines", ext: "yml", path: "azure-pipelines.yml" },
] as const;

const DEFAULT_ANALYSIS_TYPES = [
  "typescript",
  "eslint",
  "dependency-audit",
  "security-scan",
  "test-runner",
];

function CiIntegrationPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedRepositoryId, setSelectedRepositoryId] = useState("");

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repositoriesLoading, setRepositoriesLoading] = useState(false);

  const [platform, setPlatform] = useState<CiConfigGenerateInput["platform"]>("github");
  const [apiUrl, setApiUrl] = useState("http://localhost:3000/api");
  const [triggers, setTriggers] = useState<CiConfigGenerateInput["triggers"]>(["push", "pull_request"]);
  const [analysisTypes, setAnalysisTypes] = useState<string[]>(DEFAULT_ANALYSIS_TYPES);
  const [mergeGate, setMergeGate] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<CiConfigResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Persistent banner about token requirement
  const tokenWarning = (
    <div className="rounded-xl border border-orange-400 bg-orange-50 p-4 mb-4 flex items-start gap-3">
      <AlertCircle className="text-orange-600 mt-0.5" size={20} />
      <div className="flex-1">
        <p className="text-sm font-medium text-orange-700">
          ⚠️ Generated pipelines need an <code>AEGIS_API_TOKEN</code> secret, and Aegis
          does not yet issue long-lived API tokens. These configs will not run
          unattended until that is built.
        </p>
        <p className="text-xs text-orange-600 mt-1">
          A valid token must be added as a GitHub Actions secret named
          <code>AEGIS_API_TOKEN</code> in the repository settings.
        </p>
      </div>
    </div>
  );

  // Localhost/private IP warning
  const privateIpPattern = new RegExp(
    "^localhost$|^127\\.0\\.0\\.1$|^192\\.168\\.|^10\\.|^172\\.(1[6-9]|2[0-9]|3[0-1])\\.",
  );
  const apiUrlIsPrivate = privateIpPattern.test(apiUrl);

  const ipWarning = apiUrlIsPrivate && !generating ? (
    <p className="mt-1 text-xs text-orange-600">
      ⚠️ This CI config references a localhost/private API URL. The generated
      pipeline will only run on runners that can reach this address (typically
      only your local machine). For remote CI/CD, use a publicly reachable
      API URL.
    </p>
  ) : null;

  // Load projects on mount
  useEffect(() => {
    let active = true;

    async function loadProjects() {
      try {
        const response = await getProjects();
        if (active) {
          setProjects(response.data);
          if (response.data.length > 0 && !selectedProjectId) {
            setSelectedProjectId(response.data[0].id);
          }
        }
      } catch {
        if (active) toast.error("Failed to load projects");
      } finally {
        if (active) setProjectsLoading(false);
      }
    }

    loadProjects();
    return () => { active = false; };
  }, [selectedProjectId]);

  // Load repositories when project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setRepositories([]);
      return;
    }

    let active = true;
    setRepositoriesLoading(true);

    async function loadRepositories() {
      try {
        const response = await getRepositories(selectedProjectId);
        if (active) setRepositories(response.data);
      } catch {
        if (active) toast.error("Failed to load repositories");
      } finally {
        if (active) setRepositoriesLoading(false);
      }
    }

    loadRepositories();
    return () => { active = false; };
  }, [selectedProjectId]);

  const handleGenerate = useCallback(async () => {
    if (!selectedProjectId || !selectedRepositoryId) {
      setError("Please select a project and repository");
      return;
    }

    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const input: CiConfigGenerateInput = {
        platform,
        repositoryId: selectedRepositoryId,
        apiUrl,
        triggers,
        analysisTypes,
        mergeGate,
      };

      const response = await generateCiConfig(selectedProjectId, input);

      if (response.success && response.data) {
        setResult(response.data);
        toast.success(response.message);
      } else {
        setError(response.message || "Failed to generate CI configuration");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }, [selectedProjectId, selectedRepositoryId, platform, apiUrl, triggers, analysisTypes, mergeGate]);

  const handleDownload = () => {
    if (!result) return;

    const blob = new Blob([result.content], { type: "application/x-yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filePath.split("/").pop() || `ci-config.${PLATFORMS.find(p => p.id === platform)?.ext ?? "yml"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result.content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const selectedPlatformInfo = PLATFORMS.find(p => p.id === platform);

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-cyan-600" size={24} />
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">CI/CD Integration</h1>
          <p className="mt-2 text-slate-400">
            Generate CI configuration files for automated Aegis analysis runs.
          </p>
        </div>
      </div>

      {/* Token Warning Banner */}
      {tokenWarning}

      {/* Project & Repository Selection */}
      <div className="rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
        <h2 className="text-lg font-semibold text-[#172033]">Select Target</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[#344054] mb-1">Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full rounded-lg border border-[#dfe4eb] bg-white px-3 py-2 text-sm text-[#344054]"
            >
              <option value="">Select a project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#344054] mb-1">Repository</label>
            <select
              value={selectedRepositoryId}
              onChange={(e) => setSelectedRepositoryId(e.target.value)}
              disabled={!selectedProjectId || repositoriesLoading}
              className="w-full rounded-lg border border-[#dfe4eb] bg-white px-3 py-2 text-sm text-[#344054] disabled:bg-[#f8fafc]"
            >
              <option value="">Select a repository</option>
              {repositories.map((repo) => (
                <option key={repo.id} value={repo.id}>{repo.name}</option>
              ))}
            </select>
          </div>
        </div>

        {repositories.find((r) => r.id === selectedRepositoryId) && (
          <div className="mt-4 p-3 rounded-lg bg-[#f8fafc] border border-[#edf0f4]">
            <p className="text-sm font-medium text-[#172033]">{repositories.find((r) => r.id === selectedRepositoryId)!.name}</p>
            <p className="text-xs text-[#667085]">{repositories.find((r) => r.id === selectedRepositoryId)!.url}</p>
            <p className="text-xs text-[#667085]">Status: <span className="font-medium capitalize">{repositories.find((r) => r.id === selectedRepositoryId)!.status.toLowerCase()}</span></p>
          </div>
        )}
      </div>

      {/* Configuration Options */}
      <div className="rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
        <h2 className="text-lg font-semibold text-[#172033]">CI Configuration</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Platform Selector */}
          <div>
            <label className="block text-sm font-medium text-[#344054] mb-1">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as CiConfigGenerateInput["platform"])}
              className="w-full rounded-lg border border-[#dfe4eb] bg-white px-3 py-2 text-sm text-[#344054]"
            >
              {PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* API URL */}
          <div>
            <label className="block text-sm font-medium text-[#344054] mb-1">Aegis API URL</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:3000/api"
              className="w-full rounded-lg border border-[#dfe4eb] bg-white px-3 py-2 text-sm text-[#344054] placeholder:text-[#98a2b3]"
            />
            <p className="mt-1 text-xs text-[#98a2b3]">Base URL of your Aegis API (used in generated CI)</p>
            {ipWarning}
          </div>

          {/* Merge Gate */}
          <div className="flex flex-col">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mergeGate}
                onChange={(e) => setMergeGate(e.target.checked)}
                className="rounded border-[#dfe4eb] text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm font-medium text-[#344054]">Enable merge gate</span>
            </label>
            <p className="mt-1 text-xs text-[#98a2b3] ml-7">
              The gate only blocks merges if this workflow is configured as a
              required status check in your repository's branch protection rules.
            </p>
          </div>
        </div>

        {/* Triggers */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-[#344054] mb-1">Triggers (GitHub Actions only)</label>
          <div className="flex flex-wrap gap-3">
            {(["push", "pull_request", "schedule"] as const).map((t) => (
              <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={triggers?.includes(t)}
                  onChange={(e) => setTriggers(e.target.checked ? [...(triggers ?? []), t] : (triggers ?? []).filter(x => x !== t))}
                  className="rounded border-[#dfe4eb] text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-sm text-[#344054] capitalize">{t.replace("_", " ")}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Analysis Types */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-[#344054] mb-1">Analysis Types</label>
          <div className="flex flex-wrap gap-3">
            {DEFAULT_ANALYSIS_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={analysisTypes.includes(t)}
                  onChange={(e) => setAnalysisTypes(e.target.checked ? [...analysisTypes, t] : analysisTypes.filter(x => x !== t))}
                  className="rounded border-[#dfe4eb] text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-sm text-[#344054]">{t}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-6">
          <button
            onClick={handleGenerate}
            disabled={generating || !selectedProjectId || !selectedRepositoryId}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 font-medium text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Generate CI Config
              </>
            )}
          </button>
        </div>
      </div>

      {/* Output */}
      {result && (
        <div className="rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#172033]">Generated Configuration</h2>
              <p className="mt-1 text-sm text-[#667085]">
                {selectedPlatformInfo?.label} · {result.filePath}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-2 rounded-lg border border-[#dfe4eb] px-3 py-2 text-sm font-medium text-[#344054] hover:bg-[#f8fafc] transition"
              >
                <Copy size={16} />
                Copy
              </button>
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-lg border border-[#dfe4eb] px-3 py-2 text-sm font-medium text-[#344054] hover:bg-[#f8fafc] transition"
              >
                <Download size={16} />
                Download
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-[#dfe4eb] bg-[#f8fafc] overflow-hidden">
            <pre className="p-4 text-sm font-mono text-[#172033] overflow-x-auto max-h-96">
              {result.content}
            </pre>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700">Generation Failed</p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !error && (
        <div className="rounded-xl border border-[#dfe4eb] bg-white p-10 text-center">
          <p className="text-[#667085]">
            Select a project and repository, configure options, then click
            <strong className="text-[#1264d8]"> Generate CI Config</strong> to create your pipeline file.
          </p>
        </div>
      )}
    </section>
  );
}

export default CiIntegrationPage;