import {
  RepositoryProvider,
  RepositoryStatus,
} from "@prisma/client";

export type CreateRepositoryInput = {
  name: string;
  description?: string;
  provider?: RepositoryProvider;
  url?: string;
  defaultBranch?: string;
  isPrivate?: boolean;
  workspacePath?: string;
};

export type UpdateRepositoryInput = {
  name?: string;
  description?: string;
  provider?: RepositoryProvider;
  url?: string;
  defaultBranch?: string;
  isPrivate?: boolean;
  workspacePath?: string;
  status?: RepositoryStatus;
};

export type RepositoryParams = {
  id: string;
};

export type ProjectRepositoryParams = {
  projectId: string;
};

export type RepositoryQuery = {
  search?: string;
  provider?: RepositoryProvider;
  status?: RepositoryStatus;
};

export type IndexRepositoryResult = {
  repositoryId: string;
  indexedFiles: number;
  indexedChunks: number;
  storedVectors: number;
  durationMs: number;
};