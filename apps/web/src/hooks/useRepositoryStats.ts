import { useEffect, useState } from "react";

import {
  getRepositoryStats,
  type RepositoryStats,
} from "@/services/repository-stats";

export function useRepositoryStats(
  repositoryId: string
) {
  const [stats, setStats] =
    useState<RepositoryStats | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!repositoryId) {
        setLoading(false);
        return;
      }

      try {
        const data =
          await getRepositoryStats(
            repositoryId
          );

        if (!cancelled) {
          setStats(data);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [repositoryId]);

  return {
    stats,
    loading,
  };
}