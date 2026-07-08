import { useCallback, useEffect, useState } from "react";

import {
  createRepository,
  deleteRepository,
  getRepositories,
  updateRepository,
} from "@/services/repository";

import type {
  CreateRepositoryInput,
  Repository,
  UpdateRepositoryInput,
} from "@/types/repository";

export function useRepositories(
  projectId: string
) {
  const [repositories, setRepositories] =
    useState<Repository[]>([]);

  const [loading, setLoading] =
    useState(true);

  const loadRepositories =
    useCallback(async () => {
      try {
        setLoading(true);

        const response =
          await getRepositories(projectId);

        setRepositories(response.data);
      } finally {
        setLoading(false);
      }
    }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    void loadRepositories();
  }, [projectId, loadRepositories]);

  const create = useCallback(
    async (
      data: CreateRepositoryInput
    ) => {
      await createRepository(
        projectId,
        data
      );

      await loadRepositories();
    },
    [projectId, loadRepositories]
  );

  const update = useCallback(
    async (
      id: string,
      data: UpdateRepositoryInput
    ) => {
      await updateRepository(id, data);

      await loadRepositories();
    },
    [loadRepositories]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteRepository(id);

      await loadRepositories();
    },
    [loadRepositories]
  );

  return {
    repositories,
    loading,

    refresh: loadRepositories,

    createRepository: create,
    updateRepository: update,
    deleteRepository: remove,
  };
}