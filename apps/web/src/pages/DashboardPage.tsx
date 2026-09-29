import {
  FolderKanban,
  FolderGit2,
  FileBarChart,
  ShieldCheck,
} from "lucide-react";

import StatCard from "@/components/dashboard/StatCard";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentProjects from "@/components/dashboard/RecentProjects";
import RecentReports from "@/components/dashboard/RecentReports";
import ActivityFeed from "@/components/dashboard/ActivityFeed";

function DashboardPage() {
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
          value={0}
          subtitle="Active Projects"
          icon={FolderKanban}
        />

        <StatCard
          title="Repositories"
          value={0}
          subtitle="Connected Repositories"
          icon={FolderGit2}
        />

        <StatCard
          title="Reports"
          value={0}
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