import api from "./api";

export type TriageFailure = { id: string; testCaseId: string; message: string; stackTrace?: string };
export type FailureTriageResult = { contractVersion: "1.0"; groups: Array<{ groupId: string; classification: "real_bug" | "locator_change" | "flaky" | "environment_issue"; reasoning: string }> };

export async function triageFailures(failures: TriageFailure[]) {
  const response = await api.post<{ data: FailureTriageResult }>("/failure-triage", { failures });
  return response.data.data;
}
