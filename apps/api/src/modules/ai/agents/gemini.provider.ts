import { groqService } from "../gemini/gemini.service";

import type {
  AgentProvider,
  AgentProviderRequest,
} from "./agent.provider";
import { AgentProviderError } from "./agent.provider";

export class GroqAgentProvider implements AgentProvider {
  async generate(
    request: AgentProviderRequest,
  ): Promise<string> {
    try {
      return await groqService.generateText(
        request.prompt,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "AI provider request failed.";

      if (message.includes("429")) {
        throw new AgentProviderError(
          "provider-rate-limited",
          message,
        );
      }

      throw new AgentProviderError(
        "provider-unavailable",
        message,
      );
    }
  }
}

export const GeminiAgentProvider = GroqAgentProvider;
