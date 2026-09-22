import {
  agentOutputSchema,
  type AgentEvidence,
  type AgentOutput,
} from "./agent.types";
import { AgentExecutorService } from "./agent.executor";

export type ReportEvidence = {
  id: string;
  tool: string;
  message: string;
  severity?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
};

export class ReportAgentService {
  constructor(
    private readonly executor: AgentExecutorService,
  ) {}

  async analyze(input: {
    runId: string;
    projectId: string;
    repositoryId: string;
    projectProfile: Record<string, unknown>;
    evidence: ReportEvidence[];
    model: string;
    promptVersion?: string;
  }): Promise<AgentOutput> {
    if (input.evidence.length === 0) {
      return agentOutputSchema.parse({
        contractVersion: "1.0",
        agentId: "report",
        agentVersion: "1.0",
        status: "skipped",
        findings: [],
        summary: "No deterministic evidence was available for reporting.",
        skippedReason: "No evidence was produced by the analysis run.",
        durationMs: 0,
      });
    }

    const evidence: AgentEvidence[] = input.evidence.map((item) => ({
      id: item.id,
      type: "deterministic-report-evidence",
      source: item.tool,
      content: [
        item.severity ? `Severity: ${item.severity}` : "",
        item.filePath
          ? `Location: ${item.filePath}:${item.lineStart ?? "?"}`
          : "",
        item.message,
      ].filter(Boolean).join(" "),
      filePath: item.filePath,
      lineStart: item.lineStart,
      lineEnd: item.lineEnd,
    }));

    return this.executor.execute({
      contractVersion: "1.0",
      agentId: "report",
      runId: input.runId,
      projectId: input.projectId,
      repositoryId: input.repositoryId,
      projectProfile: {
        ...input.projectProfile,
        reportSections: [
          "executive-summary",
          "analysis-coverage",
          "quality-dimensions",
          "evidence",
          "recommendations",
          "limitations",
          "provenance",
        ],
      },
      evidence,
      promptVersion: input.promptVersion ?? "report-1.0",
      model: input.model,
    });
  }
}
