import {
  Calendar,
  FolderGit2,
  FolderKanban,
  Globe,
  Lock,
  Users,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import type { Project } from "@/types/project";

type ProjectCardProps = {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
};

function ProjectCard({
  project,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  const navigate = useNavigate();

  const visibilityIcon =
    project.visibility === "PUBLIC" ? (
      <Globe size={16} />
    ) : project.visibility === "TEAM" ? (
      <Users size={16} />
    ) : (
      <Lock size={16} />
    );

  const statusColor = {
    ACTIVE:
      "bg-emerald-500/15 text-emerald-400",
    ARCHIVED:
      "bg-amber-500/15 text-amber-400",
    COMPLETED:
      "bg-cyan-500/15 text-cyan-400",
  }[project.status];

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
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <FolderKanban
              className="text-cyan-400"
              size={22}
            />

            <h3 className="text-lg font-semibold">
              {project.name}
            </h3>
          </div>

          <p className="mt-2 text-sm text-slate-400">
            {project.description ??
              "No description provided."}
          </p>
        </div>

        <div className="text-slate-400">
          {visibilityIcon}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor}`}
        >
          {project.status}
        </span>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar size={14} />

          {new Date(
            project.updatedAt
          ).toLocaleDateString()}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <button
          onClick={() => onEdit(project)}
          className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium transition hover:bg-cyan-500"
        >
          Edit
        </button>

        <button
          onClick={() =>
            navigate(
              `/projects/${project.id}/repositories`
            )
          }
          className="flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 px-4 py-2 text-sm font-medium text-cyan-400 transition hover:bg-cyan-500/10"
        >
          <FolderGit2 size={16} />
          Repositories
        </button>

        <button
          onClick={() =>
            onDelete(project)
          }
          className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default ProjectCard;