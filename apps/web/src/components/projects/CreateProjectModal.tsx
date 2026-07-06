import { X } from "lucide-react";
import { toast } from "sonner";

import { createProject } from "@/services/project";
import type { CreateProjectInput } from "@/types/project";

import ProjectForm from "./ProjectForm";

type Props = {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onCreated: () => void;
};

function CreateProjectModal({
  open,
  loading,
  onClose,
  onCreated,
}: Props) {
  if (!open) return null;

  async function handleCreate(
    data: CreateProjectInput
  ) {
    try {
      await createProject(data);

      toast.success(
        "Project created successfully."
      );

      onCreated();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create project."
      );
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
            <h2 className="text-xl font-semibold">
              Create Project
            </h2>

            <button
              onClick={onClose}
              className="rounded-lg p-2 transition hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            <ProjectForm<CreateProjectInput>
              loading={loading}
              submitText="Create Project"
              onSubmit={handleCreate}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default CreateProjectModal;