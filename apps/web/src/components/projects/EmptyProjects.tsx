import { FolderOpen } from "lucide-react";

type Props = {
  onCreate: () => void;
};

function EmptyProjects({
  onCreate,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900 py-20 text-center">
      <FolderOpen
        size={64}
        className="mb-5 text-slate-500"
      />

      <h2 className="text-2xl font-semibold">
        No Projects Yet
      </h2>

      <p className="mt-2 max-w-md text-slate-400">
        Create your first project to start AI
        analysis, testing, repository
        management and reporting.
      </p>

      <button
        onClick={onCreate}
        className="mt-8 rounded-xl bg-cyan-600 px-6 py-3 font-medium transition hover:bg-cyan-500"
      >
        Create Project
      </button>
    </div>
  );
}

export default EmptyProjects;