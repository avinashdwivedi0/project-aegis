import {
  FolderKanban,
  FolderGit2,
  FileBarChart,
  ShieldCheck,
} from "lucide-react";

import { useEffect, useState } from "react";

import { getProjects } from "@/services/project";
import { getRepositories } from "@/services/repository";
import { getAnalysisRuns } from "@/services/analysis";

import StatCard from "@/components/dashboard/StatCard";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentProjects from "@/components/dashboard/RecentProjects";
import RecentReports from "@/components/dashboard/RecentReports";
import ActivityFeed from "@/components/dashboard/ActivityFeed";

function DashboardPage() {
  const [projectsCount, setProjectsCount] = useState(0);
  const [reposCount, setReposCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const [projectsRes, analysesRes] = await Promise.all([
          getProjects(),
          getAnalysisRuns(),
        ]);

        if (active) {
          // projectsRes is { success, message, data: Project[] }
          const projects = projectsRes.data;
          setProjectsCount(projects.length);

          // Fetch repositories count for each project
          const reposPerProject = await Promise.all(
            projects.map(async (p) => {
              try {
                const res = await getRepositories(p.id);
                // res is { success, message, data: Repository[] }
                return res.data?.length ?? 0;
              } catch {
                return 0;
              }
            })
          );
          setReposCount(
            reposPerProject.reduce((a, b) => a + b, 0)
          );
          setReportsCount(analysesRes.length);
        }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDashboard();
    return () => { active = false; };
  }, []);

  return (
    <div className="mx-auto max-w-360 space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#1264d8]">
          Overview
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#172033] md:text-4xl">
          Dashboard
        </h1>

        <p className="mt-2 max-w-2xl text-[#667085]">
          A clear view of your repositories, quality signals, and analysis activity.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Projects"
          value={loading ? "…" : error ? "—" : projectsCount}
          subtitle="Active Projects"
          icon={FolderKanban}
        />

        <StatCard
          title="Repositories"
          value={loading ? "…" : error ? "—" : reposCount}
          subtitle="Connected Repositories"
          icon={FolderGit2}
        />

        <StatCard
          title="Reports"
          value={loading ? "…" : error ? "—" : reportsCount}
          subtitle="Generated Reports"
          icon={FileBarChart}
        />

        <StatCard
          title="Overall Score"
          value="--"
          subtitle="AI Quality Score"
          icon={ShieldCheck}
        />
      </div>
      {error && <p role="alert" className="-mt-5 text-sm text-red-700">Some dashboard totals could not be loaded. Refresh the page to try again.</p>}

      {/* Quick Actions */}
      <QuickActions />

      {/* Projects & Reports */}
      <div className="grid gap-6 xl:grid-cols-2">
        <RecentProjects />
        <RecentReports />
      </div>

      {/* Activity Feed */}
      <ActivityFeed />
    </div>
  );
}

export default DashboardPage;
