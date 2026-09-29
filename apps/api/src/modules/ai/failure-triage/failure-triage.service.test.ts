import assert from "node:assert/strict";
import test from "node:test";

import type { AgentProvider } from "../agents/agent.provider";

import { FailureTriageService } from "./failure-triage.service";

const failures = [
  {
    id: "failure-1",
    testCaseId: "REQ-TC-001",
    message: "locator button Save not found",
    stackTrace: "page.getByRole button Save timeout 5000ms",
    screenshot: "results/run-1/failure-1.png",
  },
  {
    id: "failure-2",
    testCaseId: "REQ-TC-002",
    message: "locator button Save not found",
    stackTrace: "page.getByRole button Save timeout 5000ms",
    screenshot: "results/run-1/failure-2.png",
  },
];

class FixtureProvider implements AgentProvider {
  public prompt = "";

  async generate(request: { prompt: string }): Promise<string> {
    this.prompt = request.prompt;
    return JSON.stringify({
      contractVersion: "1.0",
      groups: [
        {
          groupId: "FAIL-GRP-001",
          classification: "locator_change",
          reasoning: "The repeated missing locator indicates a selector change.",
        },
      ],
    });
  }
}

test("failure triage groups duplicate failures before classification", async () => {
  const provider = new FixtureProvider();
  const service = new FailureTriageService(
    provider,
    "prompts/failure-triage.v1.prompt",
  );

  const output = await service.triage({ failures });

  assert.equal(output.failureGroups.length, 1);
  assert.equal(output.failureGroups[0]?.duplicateCount, 2);
  assert.equal(output.groups[0]?.classification, "locator_change");
  assert.match(provider.prompt, /failure-1/);
  assert.match(provider.prompt, /failure-2/);
});

test("failure triage rejects incomplete provider classification", async () => {
  const provider: AgentProvider = {
    async generate() {
      return JSON.stringify({ contractVersion: "1.0", groups: [] });
    },
  };
  const service = new FailureTriageService(
    provider,
    "prompts/failure-triage.v1.prompt",
  );

  await assert.rejects(
    service.triage({ failures }),
    /every failure group/i,
  );
});