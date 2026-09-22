import fs from "node:fs/promises";
import path from "node:path";

import { AgentExecutorService } from "../src/modules/ai/agents/agent.executor";
import { OllamaAgentProvider } from "../src/modules/ai/agents/ollama.provider";
import { TestAgentService } from "../src/modules/ai/agents/test.service";

const root = path.resolve(process.cwd(), "../..");
const outputPath = path.join(root, "evaluation", "results", "ai-test.json");
const model = process.env.OLLAMA_MODEL ?? "qwen2.5-coder:7b";
const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS ?? 180_000);
const service = new TestAgentService(new AgentExecutorService(new OllamaAgentProvider(), timeoutMs));
const result = await service.analyze({
  runId: "phase9-local-ollama-test",
  projectId: "fixture-node-dependencies",
  repositoryId: "fixture-node-dependencies",
  projectProfile: { projectType: "javascript", languages: ["javascript"], frameworks: [] },
  evidence: [{ id: "fixture/failing-test", tool: "test-runner", code: "FAILED", message: "Expected 4 to equal 5.", filePath: "test/failing.test.js", lineStart: 4, lineEnd: 5 }],
  model,
  promptVersion: "test-1.0",
});
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify({ schemaVersion: "phase9-ai-pipeline-v1", provider: "ollama", model, timeoutMs, result }, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
