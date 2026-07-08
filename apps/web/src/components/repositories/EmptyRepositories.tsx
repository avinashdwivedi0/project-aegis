import { FolderGit2 } from "lucide-react";

type Props = {
  onCreate: () => void;
};

function EmptyRepositories({
  onCreate,
}: Props) {
  return (
    <div
      className="
        flex
        flex-col
        items-center
        justify-center
        rounded-2xl
        border
        border-dashed
        border-slate-700
        py-20
        text-center
      "
    >
      <FolderGit2
        size={60}
        className="mb-6 text-slate-500"
      />

      <h2 className="text-2xl font-semibold">
        No repositories found
      </h2>

      <p className="mt-3 max-w-md text-slate-400">
        Create your first repository
        to start importing code,
        indexing files and preparing
        AI analysis.
      </p>

      <button
        onClick={onCreate}
        className="
          mt-8
          rounded-xl
          bg-cyan-600
          px-6
          py-3
          font-medium
          transition
          hover:bg-cyan-500
        "
      >
        Create Repository
      </button>
    </div>
  );
}

export default EmptyRepositories;