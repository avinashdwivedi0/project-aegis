export interface RepositoryFile {
  id: string;
  repositoryId: string;
  name: string;
  path: string;
  type: "file" | "directory";
  parentPath: string | null;
}