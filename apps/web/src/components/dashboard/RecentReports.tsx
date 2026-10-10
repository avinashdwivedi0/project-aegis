import { ArrowRight, FileBarChart2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import { getAnalysisRuns } from "@/services/analysis";

type RecentReport = {
  id: string;
  name: string;
  type: string;
  date: string;
};

function RecentReports() {
  const [reportData, setReportData] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getAnalysisRuns().then((res) => {
      if (active) {
        // Transform API data to match UI expectations
        // res is AnalysisRunSummary[] directly
        setReportData(
          res.slice(0, 5).map((run) => ({ // Show latest 5 reports
            id: run.id,
            name: `${run.repository.name} Analysis`,
            type: run.status === "COMPLETED" ? "Quality Report" : "In Progress",
            date: new Date(run.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
          }))
        );
      }
    }).catch((err) => {
      console.error("Failed to load reports:", err);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <section className="rounded-lg border border-[#dfe4eb] bg-white p-5 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#172033]">
          Recent Reports
        </h2>

        <Link
          to="/reports"
          className="flex items-center gap-2 text-sm font-medium text-[#1264d8] hover:text-[#0b4da8]"
        >
          View All
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-[#667085]">Loading reports...</p>
        ) : reportData.length === 0 ? (
          <p className="text-sm text-[#667085]">No reports found.</p>
        ) : (
          <div className="space-y-4">
            {reportData.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between rounded-lg border border-[#edf0f4] bg-[#fbfcfe] p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-md bg-[#e8f1ff] p-3">
                    <FileBarChart2
                      size={22}
                      className="text-[#1264d8]"
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold">
                      {report.name}
                    </h3>

                    <p className="text-sm text-[#667085]">
                      {report.type}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-[#98a2b3]">
                  {report.date}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default RecentReports;
