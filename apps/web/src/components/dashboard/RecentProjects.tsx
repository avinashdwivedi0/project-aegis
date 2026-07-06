import { FolderKanban, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const projects = [
  {
    id: 1,
    name: "Project Aegis",
    status: "In Progress",
    score: "--",
  },
];

function RecentProjects() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Recent Projects
        </h2>

        <Link
          to="/projects"
          className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300"
        >
          View All

          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="space-y-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-cyan-500/10 p-3">
                <FolderKanban
                  className="text-cyan-400"
                  size={22}
                />
              </div>

              <div>
                <h3 className="font-semibold">
                  {project.name}
                </h3>

                <p className="text-sm text-slate-400">
                  {project.status}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm text-slate-400">
                AI Score
              </p>

              <p className="font-bold text-cyan-400">
                {project.score}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecentProjects;