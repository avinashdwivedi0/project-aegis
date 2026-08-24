import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";
import AnimateSection from "./AnimateSection";

function Hero() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden border-b border-[#dfe4eb] bg-[#f6f8fb]"
    >
      <AnimateSection>
        <div className="relative mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl flex-col items-center justify-center px-6 py-24 text-center">

          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#bfd6f8] bg-white px-5 py-2 text-sm font-medium text-[#1264d8] shadow-sm">
            <ShieldCheck size={16} />
            AI-Powered Software Quality Assessment Platform
          </div>

          {/* Heading */}
          <h1 className="max-w-5xl text-5xl font-semibold leading-tight tracking-tight text-[#172033] md:text-7xl">
            Build{" "}
            <span className="text-[#1264d8]">
              Better Software
            </span>{" "}
            With Intelligent AI Agents
          </h1>

          {/* Description */}
          <p className="mt-8 max-w-3xl text-lg leading-8 text-[#667085]">
            Analyze code quality, detect security vulnerabilities, generate
            automated tests, and receive AI-powered recommendations from
            multiple specialized AI agents—all in one intelligent platform.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              className="gap-2 transition-transform duration-300 hover:scale-105"
            >
              Start Analysis
              <ArrowRight size={18} />
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="transition-transform duration-300 hover:scale-105"
            >
              View Documentation
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-20 grid w-full max-w-6xl grid-cols-2 gap-6 md:grid-cols-4">

            <div className="rounded-lg border border-[#dfe4eb] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#9abff2]">
              <h3 className="text-4xl font-semibold text-[#1264d8]">8</h3>
              <p className="mt-2 text-sm text-[#667085]">
                AI Agents
              </p>
            </div>

            <div className="rounded-lg border border-[#dfe4eb] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#9abff2]">
              <h3 className="text-4xl font-semibold text-[#1264d8]">50+</h3>
              <p className="mt-2 text-sm text-[#667085]">
                Quality Checks
              </p>
            </div>

            <div className="rounded-lg border border-[#dfe4eb] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#9abff2]">
              <h3 className="text-4xl font-semibold text-[#1264d8]">100%</h3>
              <p className="mt-2 text-sm text-[#667085]">
                Automated Analysis
              </p>
            </div>

            <div className="rounded-lg border border-[#dfe4eb] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#9abff2]">
              <h3 className="text-4xl font-semibold text-[#1264d8]">24/7</h3>
              <p className="mt-2 text-sm text-[#667085]">
                AI Assistance
              </p>
            </div>

          </div>

        </div>
      </AnimateSection>
    </section>
  );
}

export default Hero;