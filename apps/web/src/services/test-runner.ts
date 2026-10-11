import api from "./api";
import type { GeneratedPlaywrightFile } from "./script-generator";

export type TestResultBrowser = "chromium" | "firefox" | "webkit";
export type TestResultViewport = "desktop" | "mobile";
export type TestResultStatus = "passed" | "failed" | "skipped" | "timedOut";
export type TestRunnerStatus =
  | "passed"
  | "failed"
  | "timedOut"
  | "cancelled";

export type TestResult = {
  title: string;
  status: TestResultStatus;
  durationMs: number;
  error?: string;
  screenshot?: string;
  trace?: string;
};

export type TestRunnerOutput = {
  runId: string;
  repositoryId?: string;
  createdAt: string;
  status: TestRunnerStatus;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  resultsDirectory: string;
  tests: TestResult[];
  stdout: string;
  stderr: string;
  durationMs: number;
};

export type TestRunnerInput = {
  runId: string;
  repositoryId?: string;
  workspace?: never;
  files: GeneratedPlaywrightFile[];
  parallelism?: number;
  timeoutMs?: number;
  compatibility?: {
    browsers: TestResultBrowser[];
    viewports: TestResultViewport[];
  };
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function runPlaywrightTests(input: TestRunnerInput) {
  const response = await api.post<ApiResponse<TestRunnerOutput>>(
    "/test-runs",
    input,
  );
  return response.data.data;
}