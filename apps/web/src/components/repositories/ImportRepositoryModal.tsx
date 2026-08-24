import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { importGitHubRepository } from "@/services/import";
import ImportRepositoryForm from "./ImportRepositoryForm";

type Props = {
  open: boolean;
  repositoryId: string;
  onClose: () => void;
  onImported: () => void;
};

export default function ImportRepositoryModal({
  open,
  repositoryId,
  onClose,
  onImported,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleImport(url: string) {
    try {
      setLoading(true);

      await importGitHubRepository(repositoryId, url);

      toast.success("Repository imported successfully.");

      onImported();
      onClose();
    } catch (error) {
      console.error(error);

      const message =
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
          ? error.response.data.message
          : "Failed to import repository.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Import Repository</h2>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded p-1 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <ImportRepositoryForm
            loading={loading}
            onSubmit={handleImport}
          />
        </div>
      </div>
    </div>
  );
}