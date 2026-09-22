import assert from "node:assert/strict";
import test from "node:test";

import { AgentExecutorService } from "./agent.executor";
import type {
  AgentProvider,
  AgentProviderRequest,
} from "./agent.provider";
import type { AgentInput } from "./agent.types";

const input: AgentInput = {
  contractVersion: "1.0",
  agentId: "code-quality",
  runId: "run-1",
  projectId: "project-1",
  repositoryId: "repository-1",
  projectProfile: {
    projectType: "javascript",
  },
  evidence: [
    {
      id: "evidence-1",
      type: "deterministic-tool-evidence",
      source: "eslint",
      content: "Unused variable at src/app.ts:4",
      filePath: "src/app.ts",
      lineStart: 4,
    },
  ],
  promptVersion: "code-quality-1.0",
  model: "test-model",
};

class FixtureProvider implements AgentProvider {
  public request: AgentProviderRequest | undefined;

  async generate(request: AgentProviderRequest): Promise<string> {
    this.request = request;
    return JSON.stringify({
      status: "completed",
      findings: [
        {
          id: "CQ-001",
          title: "Unused variable",
          description: "A variable is declared but never used.",
          severity: "low",
          confidence: 0.98,
          evidenceIds: ["evidence-1"],
          filePath: "src/app.ts",
          lineStart: 4,
          lineEnd: 4,
          recommendation: "Remove the unused variable.",
          repairRequired: false,
        },
      ],
      summary: "One low-severity maintainability finding.",
    });
  }
}

test("agent executor validates structured provider output", async () => {
  const provider = new FixtureProvider();
  const executor = new AgentExecutorService(provider);

  const output = await executor.execute(input);

  assert.equal(output.status, "completed");
  assert.equal(output.findings[0]?.id, "CQ-001");
  assert.equal(output.findings[0]?.evidenceIds[0], "evidence-1");
  assert.equal(provider.request?.agentId, "code-quality");
  assert.match(provider.request?.prompt ?? "", /evidence-1/);
});