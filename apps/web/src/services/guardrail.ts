import api from "./api";

export type GuardrailSettings = {
  id: string;
  projectId: string;
  maxPatchRiskScore: number;
  requireManualApprovalForCritical: boolean;
  sandboxOnly: boolean;
  scope: "ADVISORY" | "ENFORCED";
  createdAt: string;
  updatedAt: string;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function getGuardrailSettings(projectId: string) {
  const response = await api.get<ApiResponse<GuardrailSettings>>(
    `/projects/${projectId}/guardrails`
  );
  return response.data.data;
}

export async function saveGuardrailSettings(
  projectId: string,
  data: Partial<Pick<
    GuardrailSettings,
    | "maxPatchRiskScore"
    | "requireManualApprovalForCritical"
    | "sandboxOnly"
    | "scope"
  >>
) {
  const response = await api.put<ApiResponse<GuardrailSettings>>(
    `/projects/${projectId}/guardrails`,
    data
  );
  return response.data.data;
}