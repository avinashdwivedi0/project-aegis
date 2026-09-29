import api from "./api";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export interface CiConfigResult {
  filePath: string;
  content: string;
}

export interface CiConfigGenerateInput {
  platform: "github" | "gitlab" | "azure";
  repositoryId: string;
  apiUrl: string;
  triggers?: ("push" | "pull_request" | "schedule")[];
  analysisTypes?: string[];
  mergeGate?: boolean;
}

export async function generateCiConfig(
  projectId: string,
  input: CiConfigGenerateInput,
): Promise<ApiResponse<CiConfigResult>> {
  const response = await api.post<ApiResponse<CiConfigResult>>(
    `/ci/projects/${projectId}/ci-config`,
    input,
  );
  return response.data;
}