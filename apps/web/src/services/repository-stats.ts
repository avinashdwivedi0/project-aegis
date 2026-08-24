import api from "./api";

export type RepositoryStats = {
  id: string;
  name: string;
  provider: "LOCAL" | "GITHUB" | "ZIP";
  status:
    | "ACTIVE"
    | "INDEXING"
    | "INDEXED"
    | "FAILED"
    | "ARCHIVED";
  defaultBranch: string | null;
  isPrivate: boolean;
  workspaceReady: boolean;
  workspacePath: string | null;
  totalFiles: number;
  totalDirectories: number;
  updatedAt: string;
};

export async function getRepositoryStats(
  repositoryId: string
) {
  const response = await api.get<{
    success: boolean;
    data: RepositoryStats;
  }>(
    `/repositories/${repositoryId}/stats`
  );

  return response.data.data;
}