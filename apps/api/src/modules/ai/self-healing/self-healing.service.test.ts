import assert from "node:assert/strict";
import test from "node:test";

import type { AgentProvider } from "../agents/agent.provider";

import { SelfHealingService } from "./self-healing.service";

test("self-healing rejects XPath proposals and does not auto-apply changes", async () => {
  const provider: AgentProvider = {
    async generate() {
      return JSON.stringify({
        contractVersion: "1.0",
        strategy: "css",
        locator: "//button[@id='save']",
        confidence: 0.9,
        reasoning: "XPath was selected.",
      });
    },
  };
  const service = new SelfHealingService(
    provider,
    "prompts/self-healing.v1.prompt",
  );

  await assert.rejects(
    service.propose("missing-owner", {
      repositoryId: "missing-repository",
      testRunId: "run-1",
      testCaseId: "REQ-TC-001",
      failedLocator: "getByRole('button', { name: 'Save' })",
      domSnapshot: "<button id='save'>Save</button>",
      screenshot: "results/run-1/save.png",
    }),
    /not found or access denied/i,
  );
});