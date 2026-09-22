import {
  agentOutputSchema,
  type AgentEvidence,
  type AgentOutput,
} from "./agent.types";
import { AgentExecutorService } from "./agent.executor";

export type ApiEvidence = {
  id: string;
  tool: string;
  message: string;
  code?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
};

export class ApiAgentService {
  constructor(
    private readonly executor: AgentExecutorService,
  ) {}

  async analyze(input: {
    runId: string;
    projectId: string;
    repositoryId: string;
    projectProfile: Record<string, unknown>;
    evidence: ApiEvidence[];
    model: string;
    promptVersion?: string;
  }): Promise<AgentOutput> {
    const apiEvidence = input.evidence.filter((item) =>
      item.tool === "api-probe"
    );

    if (apiEvidence.length === 0) {
      return agentOutputSchema.parse({
        contractVersion: "1.0",
        agentId: "api",
        agentVersion: "1.0",
        status: "skipped",
        findings: [],
        summary: "No API probe evidence was available.",
        skippedReason: "No API evidence was produced.",
        durationMs: 0,
      });
    }

    const evidence: AgentEvidence[] = apiEvidence.map((item) => ({
      id: item.id,
      type: "deterministic-api-evidence",
      source: item.tool,
      content: [
        item.code ? `Status: ${item.code}` : "",
        item.message,
      ].filter(Boolean).join(" "),
      filePath: item.filePath,
      lineStart: item.lineStart,
      lineEnd: item.lineEnd,
    }));

    return this.executor.execute({
      contractVersion: "1.0",
      agentId: "api",
      runId: input.runId,
      projectId: input.projectId,
      repositoryId: input.repositoryId,
      projectProfile: input.projectProfile,
      evidence,
      promptVersion: input.promptVersion ?? "api-1.0",
      model: input.model,
    });
  }
}
