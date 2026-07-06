export type CreateProjectInput = {
  name: string;
  description?: string;
};

export type UpdateProjectInput = {
  name?: string;
  description?: string;
  status?:
    | "ACTIVE"
    | "ARCHIVED"
    | "COMPLETED";
  visibility?:
    | "PRIVATE"
    | "TEAM"
    | "PUBLIC";
};

export type ProjectParams = {
  id: string;
};