import {
  agentOutputSchema,
  type AgentEvidence,
  type AgentOutput,
} from "./agent.types";
import { AgentExecutorService } from "./agent.executor";

export type SecurityEvidence = {
  id: string;
  tool: string;
  message: string;
  severity?: string;
  packageName?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  code?: string;
};

export class SecurityAgentService {
  constructor(
    private readonly executor: AgentExecutorService,
  ) {}

  async analyze(input: {
    runId: string;
    projectId: string;
    repositoryId: string;
    projectProfile: Record<string, unknown>;
    evidence: SecurityEvidence[];
    model: string;
    promptVersion?: string;
  }): Promise<AgentOutput> {
    const securityEvidence = input.evidence.filter((item) =>
      item.tool === "security-scan" || item.tool === "dependency-audit"
    );

    if (securityEvidence.length === 0) {
      return agentOutputSchema.parse({
        contractVersion: "1.0",
        agentId: "security",
        agentVersion: "1.0",
        status: "skipped",
        findings: [],
        summary: "No security or dependency evidence was available.",
        skippedReason: "No security evidence was produced.",
        durationMs: 0,
      });
    }

    const evidence: AgentEvidence[] = securityEvidence.map((item) => ({
      id: item.id,
      type: "deterministic-security-evidence",
      source: item.tool,
      content: [
        item.severity ? `Severity: ${item.severity}` : "",
        item.packageName ? `Package: ${item.packageName}` : "",
        item.code ? `Rule: ${item.code}` : "",
        item.message,
      ].filter(Boolean).join(" "),
      filePath: item.filePath,
      lineStart: item.lineStart,
      lineEnd: item.lineEnd,
    }));

    return this.executor.execute({
      contractVersion: "1.0",
      agentId: "security",
      runId: input.runId,
      projectId: input.projectId,
      repositoryId: input.repositoryId,
      projectProfile: input.projectProfile,
      evidence,
      promptVersion: input.promptVersion ?? "security-1.0",
      model: input.model,
    });
  }
}
