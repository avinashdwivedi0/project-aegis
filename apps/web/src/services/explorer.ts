import api from "./api";

export async function getRepositoryFiles(
  repositoryId: string
) {
  const response = await api.get(
    `/repositories/${repositoryId}/files`
  );

  return response.data.data;
}

export async function getRepositoryFileContent(
  repositoryId: string,
  filePath: string
) {
  const response = await api.get(
    `/repositories/${repositoryId}/file`,
    {
      params: {
        path: filePath,
      },
    }
  );

  return response.data.data;
}