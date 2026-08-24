import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { importGitHubRepository } from "@/services/import";
import { createRepository } from "@/services/repository";

import type {
  CreateRepositoryInput,
} from "@/types/repository";

import RepositoryForm from "./RepositoryForm";

type Props = {
  open: boolean;
  projectId: string;
  loading: boolean;
  onClose: () => void;
  onCreated: () => void;
};

function CreateRepositoryModal({
  open,
  projectId,
  loading,
  onClose,
  onCreated,
}: Props) {
  const [submitting, setSubmitting] =
    useState(false);

  if (!open) return null;

  async function handleCreate(
    data: CreateRepositoryInput
  ) {
    try {
      setSubmitting(true);

      const response = await createRepository(
        projectId,
        data
      );

      if (
        data.provider === "GITHUB" &&
        data.url
      ) {
        await importGitHubRepository(
          response.data.id,
          data.url
        );
      }

      toast.success(
        data.provider === "GITHUB"
          ? "GitHub repository connected."
          : "Repository created successfully."
      );

      onCreated();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create repository."
      );
    } finally {
      setSubmitting(false);
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
              Create Repository
            </h2>

            <button
              onClick={onClose}
              className="rounded-lg p-2 transition hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            <RepositoryForm<CreateRepositoryInput>
              loading={loading || submitting}
              submitText={
                submitting
                  ? "Connecting..."
                  : "Create Repository"
              }
              onSubmit={handleCreate}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default CreateRepositoryModal;