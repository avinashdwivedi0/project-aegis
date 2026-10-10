import { Database, FileCode2, Loader2, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { EmptyState, PageScaffold } from "@/components/ui/PageScaffold";
import { getRepositoryFileContent, getRepositoryFiles, searchRepositoryMemory } from "@/services/explorer";
import { getProjects } from "@/services/project";
import { getRepositories } from "@/services/repository";
import type { RepositoryFile } from "@/types/repository-file";
import type { Project } from "@/types/project";
import type { Repository } from "@/types/repository";

function MemoryPage() {
  const [searchParams] = useSearchParams();
  const [repositoryId, setRepositoryId] = useState(searchParams.get("repositoryId") ?? "");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [query, setQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(Boolean(repositoryId));
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState(false);
  const [semanticResults, setSemanticResults] = useState<Array<{ filePath: string; chunkIndex: number; content: string; score: number }>>([]);

  useEffect(() => {
    void getProjects().then((response) => setProjects(response.data)).catch(() => setError(true));
  }, []);

  useEffect(() => {
    if (!projectId) return;
    void getRepositories(projectId).then((response) => {
      setRepositories(response.data);
      if (!response.data.some((repository) => repository.id === repositoryId)) {
        const requested = response.data.find((repository) => repository.id === searchParams.get("repositoryId"));
        setRepositoryId(requested?.id ?? "");
      }
    }).catch(() => setError(true));
  }, [projectId, repositoryId, searchParams]);

  useEffect(() => {
    const requestedId = searchParams.get("repositoryId");
    if (!requestedId || projectId || projects.length === 0) return;
    let active = true;
    void (async () => {
      for (const project of projects) {
        try {
          const response = await getRepositories(project.id);
          if (response.data.some((repository) => repository.id === requestedId)) {
            if (!active) return;
            setProjectId(project.id);
            setRepositories(response.data);
            setRepositoryId(requestedId);
            return;
          }
        } catch { /* another project may still resolve the requested repository */ }
      }
    })();
    return () => { active = false; };
  }, [projects, projectId, searchParams]);

  useEffect(() => {
    if (!repositoryId) return;
    void getRepositoryFiles(repositoryId).then(setFiles).catch(() => setError(true)).finally(() => setLoading(false));
  }, [repositoryId]);

  const filteredFiles = useMemo(() => files.filter((file) => file.type === "file" && file.path.toLowerCase().includes(query.toLowerCase())), [files, query]);

  useEffect(() => {
    if (!repositoryId || !query.trim()) {
      return;
    }
    const timer = window.setTimeout(() => {
      void searchRepositoryMemory(repositoryId, query.trim()).then(setSemanticResults).catch(() => setError(true));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [repositoryId, query]);

  async function selectFile(file: RepositoryFile) {
    setSelectedFile(file);
    setContentLoading(true);
    try {
      const response = await getRepositoryFileContent(repositoryId, file.path);
      setContent(response.content ?? response);
    } catch {
      setContent("Unable to load indexed file content.");
    } finally {
      setContentLoading(false);
    }
  }

  const cards = [
    [FileCode2, "Indexed files", "Repository source files available to retrieval."],
    [Search, "Semantic search", "Find relevant code context across projects."],
    [Sparkles, "AI context", "Grounded memory for better recommendations."],
  ] as const;

  return (
    <PageScaffold eyebrow="Knowledge base" title="Memory" description="Search the indexed code context that powers repository analysis and AI conversations." icon={Database}>
      <div className="grid gap-5 md:grid-cols-3">
        {cards.map(([Icon, label, detail]) => (
          <div key={label} className="rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]">
            <Icon className="text-[#1264d8]" size={20} />
            <h2 className="mt-4 font-semibold text-[#172033]">{label}</h2>
            <p className="mt-2 text-sm leading-6 text-[#667085]">{detail}</p>
          </div>
        ))}
      </div>
      <section className="grid gap-4 rounded-xl border border-[#dfe4eb] bg-white p-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-[#344054]">Project<select value={projectId} onChange={(event) => { setProjectId(event.target.value); setRepositories([]); setRepositoryId(""); setFiles([]); setSelectedFile(null); setContent(""); }} className="mt-2 w-full rounded-lg border border-[#dfe4eb] bg-white px-3 py-2"><option value="">Select a project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label className="text-sm font-medium text-[#344054]">Repository<select value={repositoryId} onChange={(event) => { setRepositoryId(event.target.value); setSelectedFile(null); setContent(""); }} disabled={!projectId} className="mt-2 w-full rounded-lg border border-[#dfe4eb] bg-white px-3 py-2"><option value="">Select a repository</option>{repositories.map((repository) => <option key={repository.id} value={repository.id}>{repository.name}</option>)}</select></label>
      </section>
      {!repositoryId && <EmptyState icon={Database} title="Choose an indexed repository" description="Select a project and repository to search indexed source files." />}
      {repositoryId && <section className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"><div className="rounded-xl border border-[#dfe4eb] bg-white p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]"><label className="flex items-center gap-2 rounded-lg border border-[#dfe4eb] px-3 py-2"><Search size={17} className="text-[#667085]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search indexed memory" className="min-w-0 flex-1 text-sm outline-none" /></label>{loading && <div className="flex items-center gap-2 py-8 text-sm text-[#667085]"><Loader2 className="animate-spin" size={17} /> Loading index...</div>}{error && <p className="py-8 text-sm text-red-600">Unable to load indexed memory.</p>}{query.trim() ? <div className="mt-4 space-y-3">{semanticResults.length === 0 && !error && <p className="py-8 text-sm text-[#667085]">No semantic matches found.</p>}{semanticResults.map((result) => <button type="button" key={`${result.filePath}-${result.chunkIndex}`} onClick={() => { const file = files.find((item) => item.path === result.filePath); if (file) void selectFile(file); }} className="block w-full rounded-lg border border-[#edf0f4] p-3 text-left hover:bg-[#f8fafc]"><p className="text-xs font-semibold text-[#1264d8]">{result.filePath} · {(result.score * 100).toFixed(0)}% match</p><p className="mt-2 line-clamp-3 text-xs leading-5 text-[#667085]">{result.content}</p></button>)}</div> : <>{!loading && !error && filteredFiles.length === 0 && <p className="py-8 text-sm text-[#667085]">No indexed files found.</p>}{filteredFiles.length > 0 && <div className="mt-4 max-h-120 divide-y divide-[#edf0f4] overflow-auto">{filteredFiles.map((file) => <button type="button" key={file.id} onClick={() => void selectFile(file)} className={`flex w-full items-center gap-3 px-2 py-3 text-left text-sm hover:bg-[#f8fafc] ${selectedFile?.id === file.id ? "bg-[#f3f7fd] text-[#1264d8]" : "text-[#344054]"}`}><FileCode2 size={16} /><span className="truncate">{file.path}</span></button>)}</div>}</>}</div><div className="min-h-75 rounded-xl border border-[#dfe4eb] bg-[#172033] p-5 shadow-[0_8px_24px_rgba(23,32,51,0.04)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9cc3ff]">Indexed context</p><h2 className="mt-2 truncate font-semibold text-white">{selectedFile?.path ?? "Select a file"}</h2>{contentLoading ? <Loader2 className="mt-8 animate-spin text-[#9cc3ff]" size={18} /> : <pre className="mt-5 max-h-130 overflow-auto whitespace-pre-wrap text-xs leading-6 text-[#d7e3f5]">{content || "Select an indexed file to inspect its stored content."}</pre>}</div></section>}
    </PageScaffold>
  );
}

export default MemoryPage;
