import api from "./api";

export type SelfHealingLifecycleStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "VALIDATING"
  | "VALIDATED"
  | "ROLLED_BACK";

export type SelfHealingProposal = {
  id: string;
  repositoryId: string;
  testRunId: string;
  testCaseId: string;
  failedLocator: string;
  domSnapshot: string;
  screenshot: string;
  strategy: string;
  proposedLocator: string;
  confidence: number;
  reasoning: string;
  status: SelfHealingLifecycleStatus;
  retryCount: number;
  parentProposalId: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type SelfHealingProposalInput = {
  repositoryId: string;
  testRunId: string;
  testCaseId: string;
  failedLocator: string;
  domSnapshot: string;
  screenshot: string;
};

export type SelfHealingReviewInput = {
  status: "APPROVED" | "REJECTED";
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function listProposals(
  repositoryId?: string,
  status?:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "VALIDATING"
    | "VALIDATED"
    | "ROLLED_BACK",
) {
  const params = new URLSearchParams();
  if (repositoryId) params.set("repositoryId", repositoryId);
  if (status) params.set("status", status);

  const response = await api.get<ApiResponse<SelfHealingProposal[]>>(
    `/self-healing/proposals?${params.toString()}`,
  );
  return response.data.data;
}

export async function createProposal(
  input: SelfHealingProposalInput,
) {
  const response = await api.post<ApiResponse<SelfHealingProposal>>(
    "/self-healing/proposals",
    input,
  );
  return response.data.data;
}

export async function reviewProposal(
  proposalId: string,
  input: SelfHealingReviewInput,
) {
  const response = await api.post<ApiResponse<SelfHealingProposal>>(
    `/self-healing/proposals/${proposalId}/review`,
    input,
  );
  return response.data.data;
}

export async function validateProposal(
  proposalId: string,
  passed: boolean,
  reason?: string,
) {
  const response = await api.post<ApiResponse<SelfHealingProposal>>(
    `/self-healing/proposals/${proposalId}/validate`,
    { passed, reason },
  );
  return response.data.data;
}

export async function retryProposal(proposalId: string) {
  const response = await api.post<ApiResponse<SelfHealingProposal>>(
    `/self-healing/proposals/${proposalId}/retry`,
  );
  return response.data.data;
}
