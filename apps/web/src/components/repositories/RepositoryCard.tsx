import { useState } from "react";

import {
  AlertTriangle,
  Archive,
  Calendar,
  CheckCircle2,
  FolderGit2,
  GitBranch,
  HardDrive,
  Loader2,
  Lock,
  RefreshCw,
  ScanSearch,
  Unlock,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import { toast } from "sonner";

import ImportRepositoryModal from "./ImportRepositoryModal";

import type {
  Repository,
} from "@/types/repository";

type RepositoryCardProps = {
  repository: Repository;

  indexing: boolean;

  onEdit: (
    repository: Repository
  ) => void;

  onDelete: (
    repository: Repository
  ) => void;

  onIndex: (
    repository: Repository
  ) => Promise<void>;
};

function RepositoryCard({
  repository,
  indexing,
  onEdit,
  onDelete,
  onIndex,
}: RepositoryCardProps) {
  const navigate = useNavigate();

  const [
    importOpen,
    setImportOpen,
  ] = useState(false);

  const providerIcon = {
    LOCAL: <HardDrive size={16} />,
    GITHUB: <GitBranch size={16} />,
    ZIP: <Archive size={16} />,
  }[repository.provider];

  const statusColor = {
    ACTIVE:
      "bg-emerald-500/15 text-emerald-400",
    INDEXING:
      "bg-amber-500/15 text-amber-400",
    INDEXED:
      "bg-cyan-500/15 text-cyan-400",
    FAILED:
      "bg-red-500/15 text-red-400",
    ARCHIVED:
      "bg-slate-500/15 text-slate-400",
  }[repository.status];

  const statusIcon = {
    ACTIVE: (
      <CheckCircle2 size={14} />
    ),

    INDEXING: (
      <Loader2
        size={14}
        className="animate-spin"
      />
    ),

    INDEXED: (
      <CheckCircle2 size={14} />
    ),

    FAILED: (
      <AlertTriangle size={14} />
    ),

    ARCHIVED: (
      <Archive size={14} />
    ),
  }[repository.status];

  const isIndexed =
    repository.status === "INDEXED";

  const indexButtonLabel =
    isIndexed
      ? "Re-index"
      : "Index Repository";

  function openRepository() {
    navigate(
      `/projects/${repository.projectId}/repositories/${repository.id}`
    );
  }

  async function handleIndex() {
    try {
      await onIndex(repository);

      toast.success(
        isIndexed
          ? "Repository re-indexing started."
          : "Repository indexing started."
      );
    } catch (error) {
      console.error(
        "Repository indexing failed.",
        error
      );

      toast.error(
        "Unable to start repository indexing."
      );
    }
  }

  return (
    <>
      <div
        onClick={openRepository}
        className="
          cursor-pointer
          rounded-2xl
          border
          border-slate-800
          bg-slate-900
          p-6
          transition-all
          duration-300
          hover:border-cyan-500/50
          hover:shadow-lg
          hover:shadow-cyan-500/10
        "
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <FolderGit2
                className="shrink-0 text-cyan-400"
                size={22}
              />

              <h3 className="truncate text-lg font-semibold">
                {repository.name}
              </h3>
            </div>

            <p className="mt-2 line-clamp-2 text-sm text-slate-400">
              {repository.description ??
                "No description provided."}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 text-slate-400">
            {providerIcon}

            {repository.isPrivate ? (
              <Lock size={16} />
            ) : (
              <Unlock size={16} />
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium">
            {repository.provider}
          </span>

          {repository.defaultBranch && (
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium">
              {
                repository.defaultBranch
              }
            </span>
          )}

          <span
            className={`
              flex
              items-center
              gap-1
              rounded-full
              px-3
              py-1
              text-xs
              font-medium
              ${statusColor}
            `}
          >
            {statusIcon}

            {repository.status}
          </span>
        </div>

        <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
          <Calendar size={14} />

          {new Date(
            repository.updatedAt
          ).toLocaleDateString()}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();

                setImportOpen(true);
              }}
              disabled={indexing}
              className="
                rounded-xl
                bg-emerald-600
                px-4
                py-2
                text-sm
                font-medium
                transition
                hover:bg-emerald-500
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              Import Repository
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();

                void handleIndex();
              }}
              disabled={indexing}
              className="
                flex
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-violet-600
                px-4
                py-2
                text-sm
                font-medium
                transition
                hover:bg-violet-500
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {indexing ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />

                  Indexing...
                </>
              ) : (
                <>
                  {isIndexed ? (
                    <RefreshCw
                      size={16}
                    />
                  ) : (
                    <ScanSearch
                      size={16}
                    />
                  )}

                  {indexButtonLabel}
                </>
              )}
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();

                onEdit(repository);
              }}
              className="
                flex-1
                rounded-xl
                bg-cyan-600
                px-4
                py-2
                text-sm
                font-medium
                transition
                hover:bg-cyan-500
              "
            >
              Edit
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();

                onDelete(repository);
              }}
              className="
                flex-1
                rounded-xl
                border
                border-red-500/30
                px-4
                py-2
                text-sm
                font-medium
                text-red-400
                transition
                hover:bg-red-500/10
              "
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <ImportRepositoryModal
        open={importOpen}
        repositoryId={
          repository.id
        }
        onClose={() =>
          setImportOpen(false)
        }
        onImported={() => {
          navigate(
            `/projects/${repository.projectId}/repositories/${repository.id}`
          );
        }}
      />
    </>
  );
}

export default RepositoryCard;