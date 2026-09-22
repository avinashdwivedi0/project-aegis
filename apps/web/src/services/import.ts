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
  repositoryId: string,
  archive: File,
) {
  const formData = new FormData();
  formData.append("archive", archive);

  const response = await api.post<
    ImportResponse
  >(
    `/repositories/${repositoryId}/import/zip`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
}