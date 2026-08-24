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
    <section className="rounded-lg border border-[#dfe4eb] bg-white p-5 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#172033]">
          Recent Projects
        </h2>

        <Link
          to="/projects"
          className="flex items-center gap-2 text-sm font-medium text-[#1264d8] hover:text-[#0b4da8]"
        >
          View All

          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="space-y-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="flex items-center justify-between rounded-lg border border-[#edf0f4] bg-[#fbfcfe] p-4"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-md bg-[#e8f1ff] p-3">
                <FolderKanban
                  className="text-[#1264d8]"
                  size={22}
                />
              </div>

              <div>
                <h3 className="font-semibold">
                  {project.name}
                </h3>

                <p className="text-sm text-[#667085]">
                  {project.status}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm text-[#667085]">
                AI Score
              </p>

              <p className="font-semibold text-[#1264d8]">
                {project.score}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default RecentProjects;