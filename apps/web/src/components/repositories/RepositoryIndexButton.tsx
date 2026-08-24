import { Loader2, ScanSearch } from "lucide-react";
import { toast } from "sonner";

import { indexRepository } from "@/services/repository";

type Props = {
  repositoryId: string;
  status:
    | "ACTIVE"
    | "INDEXING"
    | "INDEXED"
    | "FAILED"
    | "ARCHIVED";
  onIndexed: () => Promise<void>;
};

export default function RepositoryIndexButton({
  repositoryId,
  status,
  onIndexed,
}: Props) {
  async function handleIndex(
    e: React.MouseEvent<HTMLButtonElement>
  ) {
    e.stopPropagation();

    try {
      toast.loading("Indexing repository...", {
        id: repositoryId,
      });

      await indexRepository(repositoryId);

      await onIndexed();

      toast.success("Repository indexing started.", {
        id: repositoryId,
      });
    } catch (error) {
      console.error(error);

      toast.error("Unable to start indexing.", {
        id: repositoryId,
      });
    }
  }

  if (status === "INDEXING") {
    return (
      <button
        disabled
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white opacity-70"
      >
        <Loader2
          className="animate-spin"
          size={16}
        />
        Indexing...
      </button>
    );
  }

  return (
    <button
      onClick={handleIndex}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-500"
    >
      <ScanSearch size={16} />

      {status === "INDEXED"
        ? "Re-index"
        : "Index Repository"}
    </button>
  );
}