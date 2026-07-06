import api from "./api";

import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
} from "@/types/project";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function getProjects() {
  const response = await api.get<
    ApiResponse<Project[]>
  >("/projects");

  return response.data;
}

export async function getProject(
  id: string
) {
  const response = await api.get<
    ApiResponse<Project>
  >(`/projects/${id}`);

  return response.data;
}

export async function createProject(
  data: CreateProjectInput
) {
  const response = await api.post<
    ApiResponse<Project>
  >("/projects", data);

  return response.data;
}

export async function updateProject(
  id: string,
  data: UpdateProjectInput
) {
  const response = await api.patch<
    ApiResponse<Project>
  >(`/projects/${id}`, data);

  return response.data;
}

export async function deleteProject(
  id: string
) {
  const response = await api.delete<
    ApiResponse<null>
  >(`/projects/${id}`);

  return response.data;
}