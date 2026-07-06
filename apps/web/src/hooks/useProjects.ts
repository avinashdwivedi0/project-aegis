import { useCallback, useEffect, useState } from "react";

import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
} from "@/services/project";

import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from "@/types/project";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);

      const response = await getProjects();

      setProjects(response.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const create = useCallback(
    async (data: CreateProjectInput) => {
      await createProject(data);

      await loadProjects();
    },
    [loadProjects]
  );

  const update = useCallback(
    async (
      id: string,
      data: UpdateProjectInput
    ) => {
      await updateProject(id, data);

      await loadProjects();
    },
    [loadProjects]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteProject(id);

      await loadProjects();
    },
    [loadProjects]
  );

  return {
    projects,
    loading,

    refresh: loadProjects,

    createProject: create,
    updateProject: update,
    deleteProject: remove,
  };
}