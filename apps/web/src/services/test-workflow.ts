import api from "./api";

export type GeneratedTestWorkflowResult = {
  runId: string;
  requirement: string;
  scenarios: { scenarios: Array<{ id: string; title: string; priority: string; preconditions: string[] }> };
  testCases: { testCases: Array<{ id: string; title: string; scenarioId: string; priority: string; steps: Array<{ number: number; action: string; expectedResult: string }>; expectedResult: string; testData: string[] }> };
  scripts: { files: Array<{ path: string; testCaseId: string }> };
  run: {
    status: "passed" | "failed" | "timedOut" | "cancelled";
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    resultsDirectory: string;
  };
};

export async function runGeneratedTestWorkflow(input: {
  projectId: string;
  repositoryId: string;
  requirement: string;
  parallelism?: number;
}) {
  const response = await api.post<{
    data: GeneratedTestWorkflowResult;
  }>("/test-workflows/run", input);
  return response.data.data;
}