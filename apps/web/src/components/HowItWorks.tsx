import {
  FolderGit2,
  BrainCircuit,
  Bug,
  FileCheck,
} from "lucide-react";
import AnimateSection from "./AnimateSection";

const steps = [
  {
    icon: FolderGit2,
    title: "Upload Project",
    description:
      "Upload your GitHub repository or local project files for AI-powered analysis.",
  },
  {
    icon: BrainCircuit,
    title: "AI Multi-Agent Analysis",
    description:
      "Specialized AI agents inspect code quality, architecture, security, and maintainability.",
  },
  {
    icon: Bug,
    title: "Detect Issues",
    description:
      "Automatically identify bugs, vulnerabilities, code smells, and performance bottlenecks.",
  },
  {
    icon: FileCheck,
    title: "Generate Report",
    description:
      "Receive a professional software quality report with actionable recommendations.",
  },
];

function HowItWorks() {
  return (
    <AnimateSection>
      <section
        id="how-it-works"
        className="bg-slate-900 py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          {/* Heading */}
          <div className="text-center">
            <h2 className="text-5xl font-black tracking-tight text-white">
              How Project Aegis Works
            </h2>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-400">
              From repository upload to an AI-generated software quality report
              in four intelligent steps.
            </p>
          </div>

          {/* Steps */}
          <div className="mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.title}
                  className="
                    group
                    rounded-3xl
                    border
                    border-slate-800
                    bg-slate-950/70
                    p-8
                    text-center
                    backdrop-blur
                    transition-all
                    duration-300
                    hover:-translate-y-2
                    hover:border-cyan-500
                    hover:shadow-xl
                    hover:shadow-cyan-500/10
                  "
                >
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10">
                    <Icon className="h-8 w-8 text-cyan-400 transition-transform duration-300 group-hover:scale-110" />
                  </div>

                  <h3 className="text-2xl font-bold text-white">
                    {step.title}
                  </h3>

                  <p className="mt-4 leading-7 text-slate-400">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </AnimateSection>
  );
}

export default HowItWorks;