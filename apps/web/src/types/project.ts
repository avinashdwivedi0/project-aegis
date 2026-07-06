export type ProjectStatus =
  | "ACTIVE"
  | "ARCHIVED"
  | "COMPLETED";

export type ProjectVisibility =
  | "PRIVATE"
  | "TEAM"
  | "PUBLIC";

export interface Project {
  id: string;

  name: string;
  description: string | null;

  status: ProjectStatus;
  visibility: ProjectVisibility;

  ownerId: string;

  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
}