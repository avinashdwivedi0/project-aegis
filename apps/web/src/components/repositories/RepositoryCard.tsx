import {
  Archive,
  Calendar,
  CheckCircle2,
  FolderGit2,
  GitBranch,
  HardDrive,
  Loader2,
  Lock,
  AlertTriangle,
  Unlock,
} from "lucide-react";

import type { Repository } from "@/types/repository";

type RepositoryCardProps = {
  repository: Repository;
  onEdit: (repository: Repository) => void;
  onDelete: (repository: Repository) => void;
};

function RepositoryCard({
  repository,
  onEdit,
  onDelete,
}: RepositoryCardProps) {
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

  return (
    <div
      className="
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
      {/* Header */}

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <FolderGit2
              className="text-cyan-400"
              size={22}
            />

            <h3 className="text-lg font-semibold">
              {repository.name}
            </h3>
          </div>

          <p className="mt-2 text-sm text-slate-400">
            {repository.description ??
              "No description provided."}
          </p>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          {providerIcon}

          {repository.isPrivate ? (
            <Lock size={16} />
          ) : (
            <Unlock size={16} />
          )}
        </div>
      </div>

      {/* Repository Info */}

      <div className="mt-6 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium">
          {repository.provider}
        </span>

        {repository.defaultBranch && (
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium">
            {repository.defaultBranch}
          </span>
        )}

        <span
          className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${statusColor}`}
        >
          {statusIcon}

          {repository.status}
        </span>
      </div>

      {/* Footer */}

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar size={14} />

          {new Date(
            repository.updatedAt
          ).toLocaleDateString()}
        </div>
      </div>

      {/* Actions */}

      <div className="mt-6 flex gap-3">
        <button
          onClick={() =>
            onEdit(repository)
          }
          className="flex-1 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium transition hover:bg-cyan-500"
        >
          Edit
        </button>

        <button
          onClick={() =>
            onDelete(repository)
          }
          className="flex-1 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default RepositoryCard;