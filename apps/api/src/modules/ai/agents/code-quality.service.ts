import { agentOutputSchema, type AgentEvidence, type AgentOutput } from "./agent.types";
import { AgentExecutorService } from "./agent.executor";

export type QualityEvidence = {
  id: string;
  tool: string;
  message: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
};

export class CodeQualityAgentService {
  constructor(
    private readonly executor: AgentExecutorService,
  ) {}

  async analyze(input: {
    runId: string;
    projectId: string;
    repositoryId: string;
    projectProfile: Record<string, unknown>;
    evidence: QualityEvidence[];
    model: string;
    promptVersion?: string;
  }): Promise<AgentOutput> {
    const qualityEvidence = input.evidence.filter((item) =>
      item.tool === "eslint" || item.tool === "typescript" || item.tool === "python-syntax"
    );

    if (qualityEvidence.length === 0) {
      return agentOutputSchema.parse({
        contractVersion: "1.0",
        agentId: "code-quality",
        agentVersion: "1.0",
        status: "skipped",
        findings: [],
        summary: "No lint or TypeScript evidence was available.",
        skippedReason: "No code-quality evidence was produced.",
        durationMs: 0,
      });
    }

    const evidence: AgentEvidence[] = qualityEvidence.map((item) => ({
      id: item.id,
      type: "deterministic-tool-evidence",
      source: item.tool,
      content: item.message,
      filePath: item.filePath,
      lineStart: item.lineStart,
      lineEnd: item.lineEnd,
    }));

    return this.executor.execute({
      contractVersion: "1.0",
      agentId: "code-quality",
      runId: input.runId,
      projectId: input.projectId,
      repositoryId: input.repositoryId,
      projectProfile: input.projectProfile,
      evidence,
      promptVersion: input.promptVersion ?? "code-quality-1.0",
      model: input.model,
    });
  }
}
