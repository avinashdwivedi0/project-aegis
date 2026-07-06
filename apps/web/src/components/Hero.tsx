import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";
import AnimateSection from "./AnimateSection";

function Hero() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-slate-950"
    >
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />

        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <AnimateSection>
        <div className="relative mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl flex-col items-center justify-center px-6 py-24 text-center">

          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-5 py-2 text-sm font-medium text-cyan-400">
            <ShieldCheck size={16} />
            AI-Powered Software Quality Assessment Platform
          </div>

          {/* Heading */}
          <h1 className="max-w-5xl text-5xl font-black leading-tight tracking-tight text-white md:text-7xl">
            Build{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 bg-clip-text text-transparent">
              Better Software
            </span>{" "}
            With Intelligent AI Agents
          </h1>

          {/* Description */}
          <p className="mt-8 max-w-3xl text-lg leading-8 text-slate-400">
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

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-2 hover:border-cyan-500 hover:shadow-xl hover:shadow-cyan-500/10">
              <h3 className="text-4xl font-black text-cyan-400">6+</h3>
              <p className="mt-2 text-sm text-slate-400">
                AI Agents
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-2 hover:border-cyan-500 hover:shadow-xl hover:shadow-cyan-500/10">
              <h3 className="text-4xl font-black text-cyan-400">50+</h3>
              <p className="mt-2 text-sm text-slate-400">
                Quality Checks
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-2 hover:border-cyan-500 hover:shadow-xl hover:shadow-cyan-500/10">
              <h3 className="text-4xl font-black text-cyan-400">100%</h3>
              <p className="mt-2 text-sm text-slate-400">
                Automated Analysis
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-2 hover:border-cyan-500 hover:shadow-xl hover:shadow-cyan-500/10">
              <h3 className="text-4xl font-black text-cyan-400">24/7</h3>
              <p className="mt-2 text-sm text-slate-400">
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