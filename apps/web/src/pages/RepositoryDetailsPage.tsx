import {
  Bot,
  Loader2,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { toast } from "sonner";

import RepositoryActions from "@/components/repositories/RepositoryActions";
import RepositoryExplorer from "@/components/repositories/RepositoryExplorer";
import RepositoryStats from "@/components/repositories/RepositoryStats";

import { useRepositoryFiles } from "@/hooks/useRepositoryFiles";
import { useRepositoryStats } from "@/hooks/useRepositoryStats";

import {
  getRepository,
  indexRepository,
} from "@/services/repository";

import type {
  Repository,
} from "@/types/repository";

function RepositoryDetailsPage() {
  const navigate = useNavigate();

  const {
    projectId,
    repositoryId,
  } = useParams<{
    projectId: string;
    repositoryId: string;
  }>();

  const safeRepositoryId =
    repositoryId ?? "";

  const [
    repository,
    setRepository,
  ] = useState<Repository | null>(
    null
  );

  const [
    repositoryLoading,
    setRepositoryLoading,
  ] = useState(
    Boolean(safeRepositoryId)
  );

  const [
    reindexing,
    setReindexing,
  ] = useState(false);

  const {
    files,
    loading,
  } = useRepositoryFiles(
    safeRepositoryId
  );

  const {
    stats,
    loading: statsLoading,
  } = useRepositoryStats(
    safeRepositoryId
  );

  const loadRepository =
    useCallback(async () => {
      if (!safeRepositoryId) {
        return;
      }

      try {
        setRepositoryLoading(true);

        const response =
          await getRepository(
            safeRepositoryId
          );

        setRepository(
          response.data
        );
      } catch (error) {
        console.error(
          "Failed to load repository.",
          error
        );

        toast.error(
          "Unable to load repository details."
        );
      } finally {
        setRepositoryLoading(false);
      }
    }, [safeRepositoryId]);

  useEffect(() => {
    if (!safeRepositoryId) {
      return;
    }

    let active = true;

    async function initializeRepository() {
      try {
        const response =
          await getRepository(
            safeRepositoryId
          );

        if (!active) {
          return;
        }

        setRepository(
          response.data
        );
      } catch (error) {
        console.error(
          "Failed to load repository.",
          error
        );

        if (active) {
          toast.error(
            "Unable to load repository details."
          );
        }
      } finally {
        if (active) {
          setRepositoryLoading(
            false
          );
        }
      }
    }

    void initializeRepository();

    return () => {
      active = false;
    };
  }, [safeRepositoryId]);

  function handleRefresh() {
    void loadRepository();

    toast.success(
      "Repository details refreshed."
    );
  }

  async function handleReindex() {
    if (
      !safeRepositoryId ||
      reindexing
    ) {
      return;
    }

    try {
      setReindexing(true);

      await indexRepository(
        safeRepositoryId
      );

      await loadRepository();

      toast.success(
        "Repository re-indexing started."
      );
    } catch (error) {
      console.error(
        "Failed to start repository re-indexing.",
        error
      );

      toast.error(
        "Unable to start repository re-indexing."
      );
    } finally {
      setReindexing(false);
    }
  }

  function handleOpenWorkspace() {
    const explorer =
      document.getElementById(
        "repository-workspace"
      );

    explorer?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function handleDeleteWorkspace() {
    toast.info(
      "Delete Workspace will be implemented in a future sprint."
    );
  }

  function handleOpenChat() {
    if (
      !projectId ||
      !repositoryId
    ) {
      toast.error(
        "Unable to open repository chat."
      );

      return;
    }

    if (
      repository?.status !==
      "INDEXED"
    ) {
      toast.warning(
        "Index the repository before using AI chat."
      );

      return;
    }

    navigate(
      `/projects/${projectId}/repositories/${repositoryId}/chat`
    );
  }

  const chatDisabled =
    repositoryLoading ||
    repository?.status !==
      "INDEXED";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Repository Explorer
          </h1>

          <p className="mt-2 text-slate-400">
            Browse indexed repository
            files and ask Aegis AI about
            the codebase.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenChat}
          disabled={chatDisabled}
          title={
            chatDisabled
              ? "Index the repository to enable AI chat."
              : "Chat with Aegis AI"
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 sm:w-auto"
        >
          {repositoryLoading ? (
            <Loader2
              size={18}
              className="animate-spin"
            />
          ) : (
            <Bot size={18} />
          )}

          {repositoryLoading
            ? "Loading..."
            : "Chat with AI"}
        </button>
      </div>

      {repository &&
        repository.status !==
          "INDEXED" && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            AI chat becomes available
            after this repository has
            been indexed successfully.
            Current status:{" "}
            <span className="font-semibold">
              {repository.status}
            </span>
          </div>
        )}

      <RepositoryActions
        loading={
          loading || reindexing
        }
        onRefresh={handleRefresh}
        onReindex={() => {
          void handleReindex();
        }}
        onOpenWorkspace={
          handleOpenWorkspace
        }
        onDeleteWorkspace={
          handleDeleteWorkspace
        }
      />

      <RepositoryStats
        stats={stats}
        loading={statsLoading}
      />

      <RepositoryExplorer
        files={files}
        loading={loading}
      />
    </div>
  );
}

export default RepositoryDetailsPage;