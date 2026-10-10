import { FolderKanban, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import { getProjects } from "@/services/project";

type RecentProject = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
};

function RecentProjects() {
  const [projectData, setProjectData] = useState<RecentProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getProjects().then((res) => {
      if (active) {
        setProjectData(
          res.data.map((p) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            createdAt: p.createdAt,
          }))
        );
      }
    }).catch((err) => {
      console.error("Failed to load projects:", err);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

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
        {loading ? (
          <p className="text-sm text-[#667085]">Loading projects...</p>
        ) : projectData.length === 0 ? (
          <p className="text-sm text-[#667085]">No projects found.</p>
        ) : (
          <div className="space-y-4">
            {projectData.map((project) => (
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
                    Created
                  </p>

                  <p className="font-semibold text-[#1264d8]">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default RecentProjects;
