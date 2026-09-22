import {
  agentInputSchema,
  agentOutputSchema,
  type AgentInput,
  type AgentOutput,
} from "./agent.types";
import { getAgent } from "./agent.registry";
import type { AgentProvider } from "./agent.provider";
import { AgentProviderError } from "./agent.provider";

export class AgentExecutorService {
  constructor(
    private readonly provider: AgentProvider,
    private readonly timeoutMs = 60_000,
  ) {}

  async execute(input: AgentInput): Promise<AgentOutput> {
    const validatedInput = agentInputSchema.parse(input);
    const definition = getAgent(validatedInput.agentId);
    const startedAt = Date.now();

    try {
      const raw = await this.withTimeout(
        this.provider.generate({
          agentId: definition.id,
          model: validatedInput.model,
          prompt: this.buildPrompt(validatedInput),
        }),
      );
      const parsed = JSON.parse(raw) as unknown;

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new Error("provider-invalid-response");
      }

      return agentOutputSchema.parse({
        ...parsed,
        contractVersion: validatedInput.contractVersion,
        agentId: definition.id,
        agentVersion: definition.version,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      const errorCode =
        error instanceof AgentProviderError
          ? error.code
          : error instanceof SyntaxError
            ? "provider-invalid-response"
            : "agent-execution-failed";

      return agentOutputSchema.parse({
        contractVersion: validatedInput.contractVersion,
        agentId: definition.id,
        agentVersion: definition.version,
        status: "failed",
        findings: [],
        summary: "Agent execution failed.",
        errorCode,
        durationMs: Date.now() - startedAt,
      });
    }
  }

  private buildPrompt(input: AgentInput): string {
    return JSON.stringify({
      contractVersion: input.contractVersion,
      agentId: input.agentId,
      projectProfile: input.projectProfile,
      evidence: input.evidence,
      instruction: "Return only one JSON object. Do not use markdown or extra keys. If evidence is insufficient, return the empty completed result shown below.",
      outputShape: {
        contractVersion: "1.0",
        agentId: input.agentId,
        agentVersion: "1.0",
        status: "completed",
        findings: [],
        summary: "Brief evidence-grounded summary.",
        durationMs: 0,
      },
      findingShape: {
        id: "stable-finding-id",
        title: "Short title",
        description: "Evidence-grounded description.",
        severity: "low",
        confidence: 0.5,
        evidenceIds: ["evidence-id"],
        filePath: "relative/path.ts",
        lineStart: 1,
        lineEnd: 1,
        recommendation: "Specific minimal recommendation.",
        repairRequired: false,
      },
    });
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("agent-timeout")), this.timeoutMs);
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
