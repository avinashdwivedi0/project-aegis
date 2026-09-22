import { AgentProviderError, type AgentProvider, type AgentProviderRequest } from "./agent.provider";

export class OllamaAgentProvider implements AgentProvider {
  constructor(
    private readonly baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
    private readonly timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS ?? 180_000),
  ) {}

  async generate(request: AgentProviderRequest): Promise<string> {
    await this.assertServiceAvailable();

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: request.model, prompt: request.prompt, stream: false, format: "json" }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new AgentProviderError(
        "provider-unavailable",
        error instanceof Error ? error.message : "Ollama is unavailable.",
      );
    }

    if (!response.ok) {
      throw new AgentProviderError("provider-unavailable", `Ollama returned HTTP ${response.status}.`);
    }

    const payload = await response.json() as { response?: unknown };
    const raw = this.extractJsonResponse(payload.response);
    this.assertJsonObject(raw);
    return raw;
  }

  private async assertServiceAvailable(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(Math.min(this.timeoutMs, 15_000)),
      });

      if (!response.ok) {
        throw new AgentProviderError("provider-unavailable", `Ollama readiness check failed with HTTP ${response.status}.`);
      }
    } catch (error) {
      if (error instanceof AgentProviderError) {
        throw error;
      }

      throw new AgentProviderError(
        "provider-unavailable",
        error instanceof Error ? error.message : "Ollama is unavailable.",
      );
    }
  }

  private extractJsonResponse(value: unknown): string {
    if (typeof value !== "string") {
      throw new AgentProviderError("provider-invalid-response", "Ollama returned no generated response.");
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new AgentProviderError("provider-invalid-response", "Ollama returned an empty response.");
    }

    const withoutCodeFence = trimmed.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return withoutCodeFence;
  }

  private assertJsonObject(raw: string): void {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new AgentProviderError("provider-invalid-response", "Ollama returned a JSON value that is not an object.");
      }
    } catch (error) {
      if (error instanceof AgentProviderError) {
        throw error;
      }

      throw new AgentProviderError("provider-invalid-response", "Ollama returned malformed JSON.");
    }
  }
}
