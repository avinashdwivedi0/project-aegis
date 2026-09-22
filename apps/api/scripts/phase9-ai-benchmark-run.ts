import fs from "node:fs/promises";
import path from "node:path";

import { AgentExecutorService } from "../src/modules/ai/agents/agent.executor";
import { OllamaAgentProvider } from "../src/modules/ai/agents/ollama.provider";
import { CodeQualityAgentService } from "../src/modules/ai/agents/code-quality.service";

const root = path.resolve(process.cwd(), "../..");
const outputPath = path.join(root, "evaluation", "results", "ai-pipeline.json");
const model = process.env.OLLAMA_MODEL ?? "qwen2.5-coder:7b";
const startedAt = new Date().toISOString();
const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS ?? 180_000);
const service = new CodeQualityAgentService(new AgentExecutorService(new OllamaAgentProvider(), timeoutMs));

let result;
try {
  result = await service.analyze({
    runId: "phase9-local-ollama",
    projectId: "fixture-typescript-quality",
    repositoryId: "fixture-typescript-quality",
    projectProfile: { projectType: "javascript", languages: ["typescript"], frameworks: [] },
    evidence: [
      { id: "fixture/no-eval", tool: "eslint", message: "Unexpected eval", filePath: "src/quality-fixture.ts", lineStart: 6 },
      { id: "fixture/secret-token", tool: "eslint", message: "Credential-like literal", filePath: "src/quality-fixture.ts", lineStart: 10 },
    ],
    model,
    promptVersion: "code-quality-1.0",
  });
} catch (error) {
  result = { status: "failed", summary: error instanceof Error ? error.message : String(error), findings: [] };
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify({ schemaVersion: "phase9-ai-pipeline-v1", provider: "ollama", model, timeoutMs, startedAt, completedAt: new Date().toISOString(), result }, null, 2)}\n`);
console.log(`Recorded local AI pipeline result at ${outputPath}.`);
console.log(JSON.stringify(result, null, 2));
