import fs from "node:fs/promises";
import path from "node:path";

import { AgentExecutorService } from "../src/modules/ai/agents/agent.executor";
import { OllamaAgentProvider } from "../src/modules/ai/agents/ollama.provider";
import { DependencyAgentService } from "../src/modules/ai/agents/dependency.service";

const root = path.resolve(process.cwd(), "../..");
const outputPath = path.join(root, "evaluation", "results", "ai-dependency.json");
const model = process.env.OLLAMA_MODEL ?? "qwen2.5-coder:7b";
const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS ?? 180_000);
const startedAt = new Date().toISOString();
const service = new DependencyAgentService(new AgentExecutorService(new OllamaAgentProvider(), timeoutMs));

const result = await service.analyze({
  runId: "phase9-local-ollama-dependency",
  projectId: "fixture-node-dependencies",
  repositoryId: "fixture-node-dependencies",
  projectProfile: { projectType: "javascript", languages: ["javascript"], frameworks: [] },
  evidence: [
    {
      id: "fixture/vulnerable-package",
      tool: "dependency-audit",
      message: "Known vulnerability in lodash 4.17.20.",
      severity: "high",
      packageName: "lodash",
      code: "GHSA-35jh-r3h4-6jhm",
    },
  ],
  model,
  promptVersion: "dependency-1.0",
});

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify({ schemaVersion: "phase9-ai-pipeline-v1", provider: "ollama", model, timeoutMs, startedAt, completedAt: new Date().toISOString(), result }, null, 2)}\n`);
console.log(`Recorded dependency AI result at ${outputPath}.`);
console.log(JSON.stringify(result, null, 2));
