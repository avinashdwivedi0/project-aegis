import {
  ShieldCheck,
  Bug,
  TestTube,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import AnimateSection from "./AnimateSection";

const metrics = [
  {
    icon: ShieldCheck,
    title: "Security",
    score: "96%",
    color: "text-green-400",
  },
  {
    icon: Bug,
    title: "Code Quality",
    score: "92%",
    color: "text-cyan-400",
  },
  {
    icon: TestTube,
    title: "Test Coverage",
    score: "88%",
    color: "text-yellow-400",
  },
  {
    icon: TrendingUp,
    title: "Maintainability",
    score: "94%",
    color: "text-purple-400",
  },
];

function ReportPreview() {
  return (
    <AnimateSection>
      <section
        id="report"
        className="bg-slate-900 py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          {/* Heading */}
          <div className="text-center">
            <h2 className="text-5xl font-black tracking-tight text-white">
              AI Quality Report
            </h2>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-400">
              Every repository analysis produces a comprehensive software
              quality report with AI-powered recommendations and actionable
              insights.
            </p>
          </div>

          {/* Report Card */}
          <div className="mt-20 rounded-3xl border border-slate-800 bg-slate-950/70 p-10 backdrop-blur">
            {/* Header */}
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <div className="mb-2 flex items-center gap-2 text-cyan-400">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    AI Generated Report
                  </span>
                </div>

                <h3 className="text-3xl font-bold text-white">
                  Project Aegis Analysis
                </h3>

                <p className="mt-2 text-slate-400">
                  Repository Analysis Summary
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-8 py-5 text-center">
                <p className="text-sm uppercase tracking-wider text-cyan-300">
                  Overall Score
                </p>

                <h2 className="mt-2 text-4xl font-black text-cyan-400">
                  93%
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Excellent
                </p>
              </div>
            </div>

            {/* Metrics */}
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {metrics.map((metric) => {
                const Icon = metric.icon;

                return (
                  <div
                    key={metric.title}
                    className="
                      group
                      rounded-2xl
                      border
                      border-slate-800
                      bg-slate-900/70
                      p-6
                      transition-all
                      duration-300
                      hover:-translate-y-2
                      hover:border-cyan-500
                      hover:shadow-xl
                      hover:shadow-cyan-500/10
                    "
                  >
                    <Icon
                      className={`mb-5 h-9 w-9 transition-transform duration-300 group-hover:scale-110 ${metric.color}`}
                    />

                    <p className="text-sm uppercase tracking-wide text-slate-500">
                      {metric.title}
                    </p>

                    <h3
                      className={`mt-3 text-4xl font-black ${metric.color}`}
                    >
                      {metric.score}
                    </h3>
                  </div>
                );
              })}
            </div>

            {/* AI Recommendations */}
            <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <h4 className="mb-4 text-xl font-bold text-white">
                AI Recommendations
              </h4>

              <ul className="space-y-3 text-slate-400">
                <li>✓ Improve authentication middleware coverage.</li>
                <li>✓ Add input validation to API endpoints.</li>
                <li>✓ Increase unit test coverage for service layer.</li>
                <li>✓ Optimize database indexing for frequent queries.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </AnimateSection>
  );
}

export default ReportPreview;