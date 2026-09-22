import {
  agentOutputSchema,
  type AgentEvidence,
  type AgentOutput,
} from "./agent.types";
import { AgentExecutorService } from "./agent.executor";

export type DependencyEvidence = {
  id: string;
  tool: string;
  message: string;
  severity?: string;
  packageName?: string;
  code?: string;
};

export class DependencyAgentService {
  constructor(
    private readonly executor: AgentExecutorService,
  ) {}

  async analyze(input: {
    runId: string;
    projectId: string;
    repositoryId: string;
    projectProfile: Record<string, unknown>;
    evidence: DependencyEvidence[];
    model: string;
    promptVersion?: string;
  }): Promise<AgentOutput> {
    const dependencyEvidence = input.evidence.filter((item) =>
      item.tool === "dependency-audit"
    );

    if (dependencyEvidence.length === 0) {
      return agentOutputSchema.parse({
        contractVersion: "1.0",
        agentId: "dependency",
        agentVersion: "1.0",
        status: "skipped",
        findings: [],
        summary: "No dependency audit evidence was available.",
        skippedReason: "No dependency evidence was produced.",
        durationMs: 0,
      });
    }

    const evidence: AgentEvidence[] = dependencyEvidence.map((item) => ({
      id: item.id,
      type: "deterministic-dependency-evidence",
      source: item.tool,
      content: [
        item.packageName ? `Package: ${item.packageName}` : "",
        item.severity ? `Severity: ${item.severity}` : "",
        item.code ? `Advisory: ${item.code}` : "",
        item.message,
      ].filter(Boolean).join(" "),
    }));

    return this.executor.execute({
      contractVersion: "1.0",
      agentId: "dependency",
      runId: input.runId,
      projectId: input.projectId,
      repositoryId: input.repositoryId,
      projectProfile: input.projectProfile,
      evidence,
      promptVersion: input.promptVersion ?? "dependency-1.0",
      model: input.model,
    });
  }
}
