import {
  agentOutputSchema,
  type AgentEvidence,
  type AgentOutput,
} from "./agent.types";
import { AgentExecutorService } from "./agent.executor";

export type TestEvidence = {
  id: string;
  tool: string;
  message: string;
  code?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
};

export class TestAgentService {
  constructor(
    private readonly executor: AgentExecutorService,
  ) {}

  async analyze(input: {
    runId: string;
    projectId: string;
    repositoryId: string;
    projectProfile: Record<string, unknown>;
    evidence: TestEvidence[];
    model: string;
    promptVersion?: string;
  }): Promise<AgentOutput> {
    const testEvidence = input.evidence.filter((item) =>
      item.tool === "test-runner"
    );

    if (testEvidence.length === 0) {
      return agentOutputSchema.parse({
        contractVersion: "1.0",
        agentId: "test",
        agentVersion: "1.0",
        status: "skipped",
        findings: [],
        summary: "No test execution evidence was available.",
        skippedReason: "No test evidence was produced.",
        durationMs: 0,
      });
    }

    const evidence: AgentEvidence[] = testEvidence.map((item) => ({
      id: item.id,
      type: "deterministic-test-evidence",
      source: item.tool,
      content: [
        item.code ? `Result: ${item.code}` : "",
        item.message,
      ].filter(Boolean).join(" "),
      filePath: item.filePath,
      lineStart: item.lineStart,
      lineEnd: item.lineEnd,
    }));

    return this.executor.execute({
      contractVersion: "1.0",
      agentId: "test",
      runId: input.runId,
      projectId: input.projectId,
      repositoryId: input.repositoryId,
      projectProfile: input.projectProfile,
      evidence,
      promptVersion: input.promptVersion ?? "test-1.0",
      model: input.model,
    });
  }
}
