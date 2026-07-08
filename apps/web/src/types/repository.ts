export type RepositoryProvider =
  | "LOCAL"
  | "GITHUB"
  | "ZIP";

export type RepositoryStatus =
  | "ACTIVE"
  | "INDEXING"
  | "INDEXED"
  | "FAILED"
  | "ARCHIVED";

export interface Repository {
  id: string;

  name: string;
  description: string | null;

  provider: RepositoryProvider;
  status: RepositoryStatus;

  url: string | null;
  defaultBranch: string | null;

  isPrivate: boolean;

  projectId: string;

  createdAt: string;
  updatedAt: string;
}

export interface CreateRepositoryInput {
  name: string;
  description?: string;

  provider?: RepositoryProvider;

  url?: string;

  defaultBranch?: string;

  isPrivate?: boolean;
}

export interface UpdateRepositoryInput {
  name?: string;

  description?: string;

  provider?: RepositoryProvider;

  status?: RepositoryStatus;

  url?: string;

  defaultBranch?: string;

  isPrivate?: boolean;
}