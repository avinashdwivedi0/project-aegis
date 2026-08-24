import AnimateSection from "./AnimateSection";
import FeatureCard from "./FeatureCard";

import {
  Bot,
  ShieldCheck,
  FlaskConical,
  BarChart3,
  ScanSearch,
  Workflow,
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI Code Review",
    description:
      "Analyze source code using intelligent AI agents.",
  },
  {
    icon: ShieldCheck,
    title: "Security Assessment",
    description:
      "Detect vulnerabilities before deployment.",
  },
  {
    icon: FlaskConical,
    title: "Automated Testing",
    description:
      "Generate unit and integration tests automatically.",
  },
  {
    icon: BarChart3,
    title: "Quality Dashboard",
    description:
      "Monitor software quality with actionable insights.",
  },
  {
    icon: ScanSearch,
    title: "Static Analysis",
    description:
      "Find bugs, smells and performance issues.",
  },
  {
    icon: Workflow,
    title: "Multi-Agent Workflow",
    description:
      "Multiple AI agents collaborate on software analysis.",
  },
];

function Features() {
  return (
    <AnimateSection>
      <section id="features" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">

          <div className="text-center">
            <h2 className="text-4xl font-semibold tracking-tight text-[#172033] md:text-5xl">
              Everything You Need
            </h2>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#667085]">
              Project Aegis combines multiple AI capabilities
              into one intelligent platform.
            </p>
          </div>

          <div className="mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard
                key={feature.title}
                {...feature}
              />
            ))}
          </div>

        </div>
      </section>
    </AnimateSection>
  );
}

export default Features;