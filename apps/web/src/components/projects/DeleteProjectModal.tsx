import { deleteProject } from "@/services/project";

import type { Project } from "@/types/project";
import { toast } from "sonner";

type Props = {
  open: boolean;
  project: Project | null;
  onClose: () => void;
  onDeleted: () => void;
};

function DeleteProjectModal({
  open,
  project,
  onClose,
  onDeleted,
}: Props) {
  if (!open || !project) return null;
  const currentProject = project;

  async function handleDelete() {
  try {
    await deleteProject(
      currentProject.id
    );

    toast.success(
      "Project deleted successfully."
    );

    onDeleted();
    onClose();
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : "Failed to delete project."
    );
  }
}

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="w-105 rounded-2xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="text-xl font-semibold">
            Delete Project
          </h2>

          <p className="mt-4 text-slate-400">
            Are you sure you want to delete
            <span className="font-semibold text-white">
              {" "}
              {project.name}
            </span>
            ?
          </p>

          <div className="mt-8 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-5 py-2"
            >
              Cancel
            </button>

            <button
              onClick={handleDelete}
              className="rounded-xl bg-red-600 px-5 py-2 text-white hover:bg-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default DeleteProjectModal;