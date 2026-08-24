import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  createRepository,
  deleteRepository,
  getRepositories,
  indexRepository,
  updateRepository,
} from "@/services/repository";

import type {
  CreateRepositoryInput,
  Repository,
  UpdateRepositoryInput,
} from "@/types/repository";

const INDEX_POLL_INTERVAL = 3000;

export function useRepositories(
  projectId: string
) {
  const [repositories, setRepositories] =
    useState<Repository[]>([]);

  const [loading, setLoading] =
    useState(Boolean(projectId));

  const [
    indexingRepositoryIds,
    setIndexingRepositoryIds,
  ] = useState<string[]>([]);

  const loadRepositories = useCallback(
    async (showLoading = true) => {
      if (!projectId) {
        return;
      }

      try {
        if (showLoading) {
          setLoading(true);
        }

        const response =
          await getRepositories(projectId);

        setRepositories(response.data);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [projectId]
  );

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const load = async () => {
      await loadRepositories();
    };

    void load();
  }, [projectId, loadRepositories]);

  const hasIndexingRepository =
    repositories.some(
      (repository) =>
        repository.status === "INDEXING"
    );

  useEffect(() => {
    if (
      !projectId ||
      !hasIndexingRepository
    ) {
      return;
    }

    const intervalId =
      window.setInterval(() => {
        void loadRepositories(false);
      }, INDEX_POLL_INTERVAL);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    projectId,
    hasIndexingRepository,
    loadRepositories,
  ]);

  const create = useCallback(
    async (
      data: CreateRepositoryInput
    ) => {
      await createRepository(
        projectId,
        data
      );

      await loadRepositories(false);
    },
    [projectId, loadRepositories]
  );

  const update = useCallback(
    async (
      id: string,
      data: UpdateRepositoryInput
    ) => {
      await updateRepository(
        id,
        data
      );

      await loadRepositories(false);
    },
    [loadRepositories]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteRepository(id);

      await loadRepositories(false);
    },
    [loadRepositories]
  );

  const index = useCallback(
    async (id: string) => {
      setIndexingRepositoryIds(
        (current) =>
          current.includes(id)
            ? current
            : [...current, id]
      );

      try {
        await indexRepository(id);

        await loadRepositories(false);
      } finally {
        setIndexingRepositoryIds(
          (current) =>
            current.filter(
              (repositoryId) =>
                repositoryId !== id
            )
        );
      }
    },
    [loadRepositories]
  );

  const isRepositoryIndexing =
    useCallback(
      (id: string) => {
        return (
          indexingRepositoryIds.includes(
            id
          ) ||
          repositories.some(
            (repository) =>
              repository.id === id &&
              repository.status ===
                "INDEXING"
          )
        );
      },
      [
        indexingRepositoryIds,
        repositories,
      ]
    );

  return {
    repositories,
    loading,

    refresh: loadRepositories,

    createRepository: create,
    updateRepository: update,
    deleteRepository: remove,
    indexRepository: index,

    isRepositoryIndexing,
  };
}