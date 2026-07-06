import { ArrowRight, FileBarChart2 } from "lucide-react";
import { Link } from "react-router-dom";

const reports = [
  {
    id: 1,
    name: "Initial Quality Assessment",
    type: "Software Quality Report",
    date: "Just now",
  },
];

function RecentReports() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Recent Reports
        </h2>

        <Link
          to="/reports"
          className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300"
        >
          View All
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="space-y-4">
        {reports.map((report) => (
          <div
            key={report.id}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-cyan-500/10 p-3">
                <FileBarChart2
                  size={22}
                  className="text-cyan-400"
                />
              </div>

              <div>
                <h3 className="font-semibold">
                  {report.name}
                </h3>

                <p className="text-sm text-slate-400">
                  {report.type}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-500">
              {report.date}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecentReports;