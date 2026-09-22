import type { AgentInput, AgentOutput } from "./agent.types";

export type AgentProviderRequest = {
  agentId: string;
  prompt: string;
  model: string;
};

export interface AgentProvider {
  generate(request: AgentProviderRequest): Promise<string>;
}

export class AgentProviderError extends Error {
  constructor(
    public readonly code: "provider-unavailable" | "provider-invalid-response" | "provider-rate-limited",
    message: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, AgentProviderError.prototype);
  }
}

export type AgentExecutor = {
  execute(input: AgentInput): Promise<AgentOutput>;
};
