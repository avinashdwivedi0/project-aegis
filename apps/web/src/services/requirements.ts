import api from "./api";

export type RequirementScenarioPriority = "critical" | "high" | "medium" | "low";

export type RequirementScenario = {
  id: string;
  title: string;
  preconditions: string[];
  priority: RequirementScenarioPriority;
};

export type RequirementAnalysisOutput = {
  contractVersion: "1.0";
  scenarios: RequirementScenario[];
};

export type RequirementAnalysisInput = {
  requirement: string;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function analyzeRequirement(
  input: RequirementAnalysisInput,
) {
  const response = await api.post<ApiResponse<RequirementAnalysisOutput>>(
    "/requirements/analyze",
    input,
  );
  return response.data.data;
}