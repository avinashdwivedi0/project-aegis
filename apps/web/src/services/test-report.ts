import api from "./api";

export type TestReport = {
  repositoryId: string;
  runHistory: Array<{
    runId: string;
    status: "passed" | "failed" | "timedOut" | "cancelled";
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    passRate: number;
    durationMs: number;
    createdAt: string;
  }>;
  passRateTrend: Array<{
    runId: string;
    createdAt: string;
    passRate: number;
  }>;
  flakyTests: Array<{
    title: string;
    runs: number;
    failures: number;
    failureRate: number;
  }>;
  slowTests: Array<{
    title: string;
    averageDurationMs: number;
    runs: number;
  }>;
  releaseReadiness: {
    ready: boolean;
    score: number;
    reasons: string[];
  };
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function getTestReport(repositoryId: string) {
  const response = await api.get<ApiResponse<TestReport>>(
    `/test-reports?repositoryId=${encodeURIComponent(repositoryId)}`,
  );
  return response.data.data;
}