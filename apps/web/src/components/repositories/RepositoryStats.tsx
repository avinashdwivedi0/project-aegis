import {
  FolderGit2,
  FolderOpen,
  GitBranch,
  HardDrive,
  Shield,
  Clock,
  CheckCircle2,
} from "lucide-react";

import type { RepositoryStats as RepositoryStatsType } from "@/services/repository-stats";

type Props = {
  stats: RepositoryStatsType | null;
  loading: boolean;
};

function RepositoryStats({
  stats,
  loading,
}: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-slate-400">
          Loading repository statistics...
        </p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const items = [
    {
      label: "Files",
      value: stats.totalFiles,
      icon: FolderGit2,
    },
    {
      label: "Directories",
      value: stats.totalDirectories,
      icon: FolderOpen,
    },
    {
      label: "Branch",
      value: stats.defaultBranch ?? "-",
      icon: GitBranch,
    },
    {
      label: "Provider",
      value: stats.provider,
      icon: HardDrive,
    },
    {
      label: "Status",
      value: stats.status,
      icon: CheckCircle2,
    },
    {
      label: "Visibility",
      value: stats.isPrivate
        ? "Private"
        : "Public",
      icon: Shield,
    },
    {
      label: "Workspace",
      value: stats.workspaceReady
        ? "Ready"
        : "Unavailable",
      icon: HardDrive,
    },
    {
      label: "Updated",
      value: new Date(
        stats.updatedAt
      ).toLocaleString(),
      icon: Clock,
    },
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">
          Repository Statistics
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Overview of the indexed repository.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-lg border border-slate-800 bg-slate-950 p-4"
            >
              <div className="mb-3 flex items-center gap-2 text-cyan-400">
                <Icon size={18} />

                <span className="text-sm font-medium">
                  {item.label}
                </span>
              </div>

              <div className="truncate text-lg font-semibold">
                {item.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RepositoryStats;