import api from "./api";

export type BlackBoxRunResult = {
  repository: { id: string; name: string };
  type: "black-box";
  discoveredFlow: {
    name: string;
    frontendRoutes: string[];
    sourceEvidence: string[];
  };
  generatedFile: { path: string; content: string };
  execution: {
    runId: string;
    status: "passed" | "failed" | "timedOut" | "cancelled";
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    resultsDirectory: string;
    durationMs: number;
    tests: Array<{ title: string; status: string; durationMs: number; error?: string }>;
  };
};

export type BlackBoxRerunResult = {
  baselineRunId: string;
  mode: "regression";
  execution: BlackBoxRunResult["execution"];
};

export type LiveSuiteResult = {
  runId: string;
  repository: { id: string; name: string };
  type: "unit" | "integration";
  suite: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  targetFiles?: Array<{ file: string; targets: unknown[] }>;
  discoveredRoutes?: Array<{ method: string; path: string; filePath: string; line: number }>;
  routeCoverage?: { covered: number; discovered: number; uncovered: string[] };
  contractKind?: string;
  generatedTest: { path: string; content: string };
  execution: { status: string; exitCode: number | null; stdout: string; stderr: string; durationMs: number };
};

export type LiveRunModeResult = {
  repository: { id: string; name: string };
  mode: "smoke" | "sanity" | "system" | "regression" | "acceptance";
  changedFiles: string[];
  gaps: string[];
  selection: Array<{ id: string; type: string; suite: string; sourceFiles: string[]; tags: string[]; previousStatus: string }>;
  execution?: { totals: { selected: number; passed: number; failed: number }; scheduled: Array<{ descriptor: { id: string; type: string; suite?: string }; status: string; error?: string; result?: unknown }> };
  acceptancePath?: string;
  message?: string;
};

export type LiveSecurityResult = {
  runId: string;
  status: "passed" | "failed" | "partial";
  scannedFiles: number;
  findingCount: number;
  findings: Array<{ ruleId: string; severity: string; filePath: string; line: number; message: string }>;
  checks: Array<{ name: string; status: string; coverage?: string; packages?: number }>;
  coverageGaps: string[];
};

export type AutonomousRunHistoryItem = {
  runId: string;
  type: string;
  suite?: string;
  mode?: string;
  status: "passed" | "failed" | "partial" | "unknown";
  createdAt: string;
  total: number;
  passed: number;
  failed: number;
  generatedSourceAvailable: boolean;
};

export async function getAutonomousRunHistory(repositoryId: string) {
  const response = await api.get<{ data: AutonomousRunHistoryItem[] }>(`/autonomous-testing/runs/${encodeURIComponent(repositoryId)}`);
  return response.data.data;
}

export async function runUnitSuite(input: { repositoryId: string; suite: "password-helpers" | "exported-components" }) {
  const response = await api.post<{ data: LiveSuiteResult }>("/autonomous-testing/unit/run", input);
  return response.data.data;
}

export async function runIntegrationSuite(input: { repositoryId: string; suite: "signup-login" | "new-order" | "dashboard-data"; baseUrl: string }) {
  const response = await api.post<{ data: LiveSuiteResult }>("/autonomous-testing/integration/run", input);
  return response.data.data;
}

export async function runLiveMode(input: {
  repositoryId: string;
  mode: LiveRunModeResult["mode"];
  frontendUrl?: string;
  dashboardUrl?: string;
  integrationBaseUrl?: string;
}) {
  const response = await api.post<{ data: LiveRunModeResult }>("/autonomous-testing/run-modes/run", input);
  return response.data.data;
}

export async function runSecurityScan(input: { repositoryId: string }) {
  const response = await api.post<{ data: LiveSecurityResult }>("/autonomous-testing/security/run", input);
  return response.data.data;
}

export async function runInferredBlackBox(input: {
  repositoryId: string;
  frontendUrl: string;
  dashboardUrl: string;
}) {
  const response = await api.post<{ data: BlackBoxRunResult }>(
    "/autonomous-testing/black-box/run",
    input,
  );
  return response.data.data;
}

export async function rerunInferredBlackBox(input: { repositoryId: string; baselineRunId: string }) {
  const response = await api.post<{ data: BlackBoxRerunResult }>(
    "/autonomous-testing/black-box/rerun",
    input,
  );
  return response.data.data;
}
