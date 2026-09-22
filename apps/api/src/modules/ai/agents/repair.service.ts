import {
  agentOutputSchema,
  type AgentEvidence,
  type AgentOutput,
} from "./agent.types";
import { AgentExecutorService } from "./agent.executor";

export type RepairEvidence = {
  id: string;
  source: string;
  content: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
};

export class RepairAgentService {
  constructor(
    private readonly executor: AgentExecutorService,
  ) {}

  async analyze(input: {
    runId: string;
    projectId: string;
    repositoryId: string;
    projectProfile: Record<string, unknown>;
    findingTitle: string;
    findingDescription: string;
    filePath?: string;
    source?: string;
    evidence: RepairEvidence[];
    model: string;
    promptVersion?: string;
  }): Promise<AgentOutput> {
    if (!input.findingTitle || !input.findingDescription || !input.source) {
      return agentOutputSchema.parse({
        contractVersion: "1.0",
        agentId: "repair",
        agentVersion: "1.0",
        status: "skipped",
        findings: [],
        summary: "Repair proposal requires a finding and source context.",
        skippedReason: "Finding or source context was not provided.",
        durationMs: 0,
      });
    }

    const evidence: AgentEvidence[] = [
      ...input.evidence.map((item) => ({
        id: item.id,
        type: "finding-evidence",
        source: item.source,
        content: item.content,
        filePath: item.filePath,
        lineStart: item.lineStart,
        lineEnd: item.lineEnd,
      })),
      {
        id: `${input.runId}:repair-source`,
        type: "source-context",
        source: "repository-workspace",
        content: input.source,
        filePath: input.filePath,
      },
    ];

    return this.executor.execute({
      contractVersion: "1.0",
      agentId: "repair",
      runId: input.runId,
      projectId: input.projectId,
      repositoryId: input.repositoryId,
      projectProfile: {
        ...input.projectProfile,
        findingTitle: input.findingTitle,
        findingDescription: input.findingDescription,
      },
      evidence,
      promptVersion: input.promptVersion ?? "repair-1.0",
      model: input.model,
    });
  }
}
