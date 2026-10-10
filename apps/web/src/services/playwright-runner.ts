import api from "./api";

export type PlaywrightRun = {
  runId: string;
  status: "passed" | "failed" | "timedOut" | "cancelled";
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  tests: Array<{ title: string; status: string; durationMs: number; error?: string }>;
  stdout: string;
  stderr: string;
  durationMs: number;
};

export async function runPlaywrightFiles(input: { runId: string; repositoryId: string; files: Array<{ path: string; language: "typescript"; testCaseId: string; content: string }> }) {
  const response = await api.post<{ data: PlaywrightRun }>("/test-runs", input);
  return response.data.data;
}
