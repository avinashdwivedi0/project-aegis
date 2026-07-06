import { X } from "lucide-react";
import { toast } from "sonner";

import { updateProject } from "@/services/project";

import type {
  Project,
  UpdateProjectInput,
} from "@/types/project";

import ProjectForm from "./ProjectForm";

type Props = {
  open: boolean;
  project: Project | null;
  loading: boolean;
  onClose: () => void;
  onUpdated: () => void;
};

function EditProjectModal({
  open,
  project,
  loading,
  onClose,
  onUpdated,
}: Props) {
  if (!open || !project) return null;

  const currentProject = project;

  async function handleSubmit(
    data: UpdateProjectInput
  ) {
    try {
      await updateProject(
        currentProject.id,
        data
      );

      toast.success(
        "Project updated successfully."
      );

      onUpdated();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update project."
      );
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
            <h2 className="text-xl font-semibold">
              Edit Project
            </h2>

            <button
              onClick={onClose}
              className="rounded-lg p-2 transition hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <ProjectForm<UpdateProjectInput>
              key={currentProject.id}
              initialData={currentProject}
              loading={loading}
              submitText="Save Changes"
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default EditProjectModal;