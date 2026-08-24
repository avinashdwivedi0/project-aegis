import { useEffect, useState } from "react";

import { getRepositoryFileContent } from "@/services/explorer";

type FileContent = {
  name: string;
  path: string;
  language: string;
  content: string;
};

export function useFileContent(
  repositoryId: string,
  filePath: string | null
) {
  const [file, setFile] =
    useState<FileContent | null>(null);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!repositoryId || !filePath) {
        setFile(null);
        return;
      }

      setLoading(true);

      try {
        const data =
          await getRepositoryFileContent(
            repositoryId,
            filePath
          );

        if (!cancelled) {
          setFile(data);
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setFile(null);
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
  }, [repositoryId, filePath]);

  return {
    file,
    loading,
  };
}