import {
  Database,
  Server,
  Brain,
  Boxes,
  ShieldCheck,
  Code2,
  Cpu,
  Package,
} from "lucide-react";
import AnimateSection from "./AnimateSection";

const technologies = [
  { icon: Code2, name: "React 19" },
  { icon: Server, name: "Express API" },
  { icon: Database, name: "PostgreSQL" },
  { icon: Boxes, name: "Prisma ORM" },
  { icon: Package, name: "Docker" },
  { icon: Brain, name: "Multi-Agent AI" },
  { icon: ShieldCheck, name: "Security Analysis" },
  { icon: Cpu, name: "Local LLMs" },
];

function TechStack() {
  return (
    <AnimateSection>
      <section
        id="tech-stack"
        className="bg-slate-950 py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          {/* Heading */}
          <div className="text-center">
            <h2 className="text-5xl font-black tracking-tight text-white">
              Technology Stack
            </h2>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-400">
              Project Aegis combines modern full-stack technologies with
              AI-powered software engineering to deliver intelligent code
              analysis, security assessment, automated testing, and
              professional quality reports.
            </p>
          </div>

          {/* Technology Grid */}
          <div className="mt-20 grid grid-cols-2 gap-6 md:grid-cols-4">
            {technologies.map((tech) => {
              const Icon = tech.icon;

              return (
                <div
                  key={tech.name}
                  className="
                    group
                    rounded-3xl
                    border
                    border-slate-800
                    bg-slate-900/70
                    p-8
                    backdrop-blur
                    transition-all
                    duration-300
                    hover:-translate-y-2
                    hover:border-cyan-500
                    hover:bg-slate-900
                    hover:shadow-xl
                    hover:shadow-cyan-500/10
                  "
                >
                  <div className="flex justify-center">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10">
                      <Icon
                        className="
                          h-8
                          w-8
                          text-cyan-400
                          transition-transform
                          duration-300
                          group-hover:scale-110
                        "
                      />
                    </div>
                  </div>

                  <h3 className="text-center text-lg font-bold text-white">
                    {tech.name}
                  </h3>
                </div>
              );
            })}
          </div>

          {/* Bottom Info */}
          <div className="mt-20 rounded-3xl border border-slate-800 bg-slate-900/50 p-8 backdrop-blur">
            <div className="grid gap-8 md:grid-cols-3">
              <div>
                <h4 className="mb-3 text-xl font-bold text-cyan-400">
                  Frontend
                </h4>

                <p className="leading-7 text-slate-400">
                  React 19, TypeScript, Tailwind CSS, Shadcn UI,
                  Framer Motion and Zustand provide a fast,
                  responsive and modern user experience.
                </p>
              </div>

              <div>
                <h4 className="mb-3 text-xl font-bold text-cyan-400">
                  Backend
                </h4>

                <p className="leading-7 text-slate-400">
                  Express.js, Prisma ORM, PostgreSQL and Docker
                  power a scalable backend architecture designed
                  for enterprise-grade software analysis.
                </p>
              </div>

              <div>
                <h4 className="mb-3 text-xl font-bold text-cyan-400">
                  Artificial Intelligence
                </h4>

                <p className="leading-7 text-slate-400">
                  Multiple specialized AI agents collaborate to
                  perform code review, security analysis,
                  automated testing, documentation generation and
                  intelligent software quality assessment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AnimateSection>
  );
}

export default TechStack;