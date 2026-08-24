import api from "./api";

import type {
  Repository,
  CreateRepositoryInput,
  UpdateRepositoryInput,
} from "@/types/repository";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function getRepositories(
  projectId: string
) {
  const response = await api.get<
    ApiResponse<Repository[]>
  >(`/projects/${projectId}/repositories`);

  return response.data;
}

export async function getRepository(
  id: string
) {
  const response = await api.get<
    ApiResponse<Repository>
  >(`/repositories/${id}`);

  return response.data;
}

export async function createRepository(
  projectId: string,
  data: CreateRepositoryInput
) {
  const response = await api.post<
    ApiResponse<Repository>
  >(
    `/projects/${projectId}/repositories`,
    data
  );

  return response.data;
}

export async function updateRepository(
  id: string,
  data: UpdateRepositoryInput
) {
  const response = await api.patch<
    ApiResponse<Repository>
  >(`/repositories/${id}`, data);

  return response.data;
}

export async function deleteRepository(
  id: string
) {
  const response = await api.delete<
    ApiResponse<null>
  >(`/repositories/${id}`);

  return response.data;
}

export async function indexRepository(
  id: string
) {
  const response = await api.post<
    ApiResponse<Repository>
  >(`/repositories/${id}/index`);

  return response.data;
}