import {
  agentOutputSchema,
  type AgentEvidence,
  type AgentOutput,
} from "./agent.types";
import { AgentExecutorService } from "./agent.executor";

export type UiAccessibilityEvidence = {
  id: string;
  tool: string;
  message: string;
  code?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
};

export class UiAccessibilityAgentService {
  constructor(
    private readonly executor: AgentExecutorService,
  ) {}

  async analyze(input: {
    runId: string;
    projectId: string;
    repositoryId: string;
    projectProfile: Record<string, unknown>;
    evidence: UiAccessibilityEvidence[];
    model: string;
    promptVersion?: string;
  }): Promise<AgentOutput> {
    const uiEvidence = input.evidence.filter((item) =>
      item.tool === "browser-accessibility"
    );

    if (uiEvidence.length === 0) {
      return agentOutputSchema.parse({
        contractVersion: "1.0",
        agentId: "ui-accessibility",
        agentVersion: "1.0",
        status: "skipped",
        findings: [],
        summary: "No browser or accessibility evidence was available.",
        skippedReason: "No UI/accessibility evidence was produced.",
        durationMs: 0,
      });
    }

    const evidence: AgentEvidence[] = uiEvidence.map((item) => ({
      id: item.id,
      type: "deterministic-ui-evidence",
      source: item.tool,
      content: [
        item.code ? `Rule: ${item.code}` : "",
        item.message,
      ].filter(Boolean).join(" "),
      filePath: item.filePath,
      lineStart: item.lineStart,
      lineEnd: item.lineEnd,
    }));

    return this.executor.execute({
      contractVersion: "1.0",
      agentId: "ui-accessibility",
      runId: input.runId,
      projectId: input.projectId,
      repositoryId: input.repositoryId,
      projectProfile: input.projectProfile,
      evidence,
      promptVersion: input.promptVersion ?? "ui-accessibility-1.0",
      model: input.model,
    });
  }
}
