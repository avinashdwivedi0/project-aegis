import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import {
  CreateProjectModal,
  DeleteProjectModal,
  EditProjectModal,
  EmptyProjects,
  LoadingProjects,
  ProjectGrid,
  ProjectSearch,
  StatusFilter,
  VisibilityFilter,
} from "@/components/projects";

import { useProjects } from "@/hooks/useProjects";

import type { Project } from "@/types/project";

function ProjectsPage() {
  const {
    projects,
    loading,
    refresh,
  } = useProjects();

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("ALL");

  const [visibility, setVisibility] =
    useState("ALL");

  const [createOpen, setCreateOpen] =
    useState(false);

  const [editOpen, setEditOpen] =
    useState(false);

  const [deleteOpen, setDeleteOpen] =
    useState(false);

  const [
    selectedProject,
    setSelectedProject,
  ] = useState<Project | null>(null);

  function handleEdit(project: Project) {
    setSelectedProject(project);
    setEditOpen(true);
  }

  function handleDelete(project: Project) {
    setSelectedProject(project);
    setDeleteOpen(true);
  }

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.name
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (project.description ?? "")
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus =
        status === "ALL" ||
        project.status === status;

      const matchesVisibility =
        visibility === "ALL" ||
        project.visibility === visibility;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesVisibility
      );
    });
  }, [
    projects,
    search,
    status,
    visibility,
  ]);

  if (loading) {
    return <LoadingProjects />;
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Projects
          </h1>

          <p className="mt-2 text-slate-400">
            Manage all your AI software
            projects.
          </p>
        </div>

        <button
          onClick={() =>
            setCreateOpen(true)
          }
          className="flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 font-medium transition hover:bg-cyan-500"
        >
          <Plus size={18} />
          New Project
        </button>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <ProjectSearch
          value={search}
          onChange={setSearch}
        />

        <StatusFilter
          value={status}
          onChange={setStatus}
        />

        <VisibilityFilter
          value={visibility}
          onChange={setVisibility}
        />
      </div>

      {/* Content */}
      {filteredProjects.length === 0 ? (
        <EmptyProjects
          onCreate={() =>
            setCreateOpen(true)
          }
        />
      ) : (
        <ProjectGrid
          projects={filteredProjects}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Create */}
      <CreateProjectModal
        open={createOpen}
        loading={false}
        onClose={() =>
          setCreateOpen(false)
        }
        onCreated={refresh}
      />

      {/* Edit */}
      <EditProjectModal
        open={editOpen}
        project={selectedProject}
        loading={false}
        onClose={() =>
          setEditOpen(false)
        }
        onUpdated={refresh}
      />

      {/* Delete */}
      <DeleteProjectModal
        open={deleteOpen}
        project={selectedProject}
        onClose={() =>
          setDeleteOpen(false)
        }
        onDeleted={refresh}
      />
    </>
  );
}

export default ProjectsPage;