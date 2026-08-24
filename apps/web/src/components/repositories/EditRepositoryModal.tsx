import { X } from "lucide-react";
import { toast } from "sonner";

import { updateRepository } from "@/services/repository";

import type {
  Repository,
  UpdateRepositoryInput,
} from "@/types/repository";

import RepositoryForm from "./RepositoryForm";

type Props = {
  open: boolean;
  repository: Repository | null;
  loading: boolean;
  onClose: () => void;
  onUpdated: () => void;
};

function EditRepositoryModal({
  open,
  repository,
  loading,
  onClose,
  onUpdated,
}: Props) {
  if (!open || !repository) return null;

  const currentRepository = repository;

  async function handleSubmit(
    data: UpdateRepositoryInput
  ) {
    try {
      await updateRepository(
        currentRepository.id,
        data
      );

      toast.success(
        "Repository updated successfully."
      );

      onUpdated();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update repository."
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
        <div className="flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
            <h2 className="text-xl font-semibold">
              Edit Repository
            </h2>

            <button
              onClick={onClose}
              className="rounded-lg p-2 transition hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <RepositoryForm<UpdateRepositoryInput>
              key={currentRepository.id}
              initialData={currentRepository}
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

export default EditRepositoryModal;