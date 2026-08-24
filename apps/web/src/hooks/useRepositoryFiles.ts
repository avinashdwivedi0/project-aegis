import { useEffect, useState } from "react";

import { getRepositoryFiles } from "@/services/explorer";

import type { RepositoryFile } from "@/types/repository-file";

export function useRepositoryFiles(
  repositoryId: string
) {
  const [files, setFiles] =
    useState<RepositoryFile[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    if (!repositoryId) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const data =
          await getRepositoryFiles(
            repositoryId
          );

        if (!cancelled) {
          setFiles(data);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [repositoryId]);

  return {
    files,
    loading,
  };
}