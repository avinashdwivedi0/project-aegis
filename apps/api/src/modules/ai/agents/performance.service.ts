import {
  agentOutputSchema,
  type AgentEvidence,
  type AgentOutput,
} from "./agent.types";
import { AgentExecutorService } from "./agent.executor";

export type PerformanceEvidence = {
  id: string;
  tool: string;
  message: string;
  severity?: string;
  code?: string;
};

export class PerformanceAgentService {
  constructor(
    private readonly executor: AgentExecutorService,
  ) {}

  async analyze(input: {
    runId: string;
    projectId: string;
    repositoryId: string;
    projectProfile: Record<string, unknown>;
    evidence: PerformanceEvidence[];
    model: string;
    promptVersion?: string;
  }): Promise<AgentOutput> {
    const performanceEvidence = input.evidence.filter((item) =>
      item.tool === "performance"
    );

    if (performanceEvidence.length === 0) {
      return agentOutputSchema.parse({
        contractVersion: "1.0",
        agentId: "performance",
        agentVersion: "1.0",
        status: "skipped",
        findings: [],
        summary: "No performance evidence was available.",
        skippedReason: "No performance evidence was produced.",
        durationMs: 0,
      });
    }

    const evidence: AgentEvidence[] = performanceEvidence.map((item) => ({
      id: item.id,
      type: "deterministic-performance-evidence",
      source: item.tool,
      content: [
        item.severity ? `Severity: ${item.severity}` : "",
        item.code ? `Metric: ${item.code}` : "",
        item.message,
      ].filter(Boolean).join(" "),
    }));

    return this.executor.execute({
      contractVersion: "1.0",
      agentId: "performance",
      runId: input.runId,
      projectId: input.projectId,
      repositoryId: input.repositoryId,
      projectProfile: input.projectProfile,
      evidence,
      promptVersion: input.promptVersion ?? "performance-1.0",
      model: input.model,
    });
  }
}
