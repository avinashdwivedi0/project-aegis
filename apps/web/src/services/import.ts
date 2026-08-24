import api from "./api";

type ImportResponse = {
  success: boolean;
  message: string;
};

export async function importGitHubRepository(
  repositoryId: string,
  url: string
) {
  const response = await api.post<
    ImportResponse
  >(
    `/repositories/${repositoryId}/import/github`,
    {
      url,
    }
  );

  return response.data;
}

export async function importZipRepository(
  repositoryId: string
) {
  const response = await api.post<
    ImportResponse
  >(
    `/repositories/${repositoryId}/import/zip`
  );

  return response.data;
}