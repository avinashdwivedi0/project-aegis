import api from "./api";

export type Finding = {
  id: string;
  source: string;
  status: string;
  severity: string;
  message: string;
  packageName?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  code?: string;
  diffContent?: string;
  patchId?: string;
  // Bridge metadata — populated by finding.service.listWithRepairMeta()
  repairFindingId?: string;
  sourceFindingKey?: string;
  bridgePending?: boolean;
  bridgeStatus?: string;
  bridgeError?: string;
};

export type AnalysisScore = {
  runId: string;
  score: number;
  scoringVersion: string;
  findingCount: number;
};

export type AnalysisRun = {
  id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  progress: number;
  currentStage: string | null;
  error: string | null;
};

export type AnalysisRunSummary = AnalysisRun & {
  ref: string;
  createdAt: string;
  completedAt: string | null;
  repository: { name: string };
};

export async function getAnalysisRuns() {
  const response = await api.get<{ data: AnalysisRunSummary[] }>("/analyses");
  return response.data.data;
}

export async function createAnalysis(input: {
  projectId: string;
  repositoryId: string;
  adapters: string[];
  ref?: string;
}) {
  const response = await api.post<{ data: AnalysisRun }>("/analyses", input);
  return response.data.data;
}

export type AnalysisEvent = {
  id: string;
  type: string;
  stage: string | null;
  message: string | null;
  progress: number | null;
  agentRole: string | null;
  createdAt: string;
};

export async function getFindings(
  runId: string,
  params?: Record<string, string>,
) {
  const response = await api.get<{ data: Finding[] }>(
    `/analyses/${runId}/findings`,
    { params },
  );
  return response.data.data;
}

export async function getAnalysisScore(runId: string) {
  const response = await api.get<{ data: AnalysisScore }>(
    `/analyses/${runId}/score`,
  );
  return response.data.data;
}

export async function getAnalysisRun(runId: string) {
  const response = await api.get<{ data: AnalysisRun }>(`/analyses/${runId}`);
  return response.data.data;
}

export async function getAnalysisEvents(runId: string) {
  const response = await api.get<{ data: AnalysisEvent[] }>(`/analyses/${runId}/events`);
  return response.data.data;
}

export async function retryAnalysis(runId: string) {
  const response = await api.post<{ data: AnalysisRun }>(`/analyses/${runId}/retry`);
  return response.data.data;
}

export async function generatePatch(findingId: string) {
  const response = await api.post<{ data: { diffContent: string } }>(
    `/repairs/findings/${findingId}/patch`,
  );
  return response.data.data;
}

export async function rejectPatch(patchId: string) {
  const response = await api.post<{ data: { patchId: string; status: string } }>(`/repairs/patches/${patchId}/reject`);
  return response.data.data;
}

export async function downloadAnalysisReport(runId: string) {
  const response = await api.get(`/analyses/${runId}/report.md`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `analysis-${runId}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function getAuditLogs(
  runId?: string,
  limit = 100,
  offset = 0,
  actorId?: string,
  targetType?: string,
  targetId?: string
) {
  let url = "/audits";
  const params: Record<string, string> = { limit: limit.toString(), offset: offset.toString() };
  if (runId) params.runId = runId;
  if (actorId) params.actorId = actorId;
  if (targetType) params.targetType = targetType;
  if (targetId) params.targetId = targetId;

  const response = await api.get<{ data: { logs: any[]; total: number } }>(url, { params });
  return response.data.data;
}
