import assert from "node:assert/strict";
import test from "node:test";

import type { AgentProvider } from "../agents/agent.provider";

import { TestDesignerService } from "./test-designer.service";

const input = {
  contractVersion: "1.0" as const,
  scenarios: [
    {
      id: "REQ-SC-001",
      title: "Reset password with a verified email",
      preconditions: ["The user has an existing account"],
      priority: "high" as const,
    },
  ],
};

class FixtureProvider implements AgentProvider {
  public calls = 0;

  constructor(private readonly responses: string[]) {}

  async generate(): Promise<string> {
    const response = this.responses[
      Math.min(this.calls, this.responses.length - 1)
    ];
    this.calls += 1;
    return response ?? "{}";
  }
}

const validOutput = JSON.stringify({
  contractVersion: "1.0",
  testCases: [
    {
      id: "REQ-TC-001",
      scenarioId: "REQ-SC-001",
      title: "Reset password using a verified email",
      priority: "high",
      preconditions: ["The user has an existing account"],
      steps: [
        {
          number: 1,
          action: "Submit the registered email address",
          expectedResult: "A password reset message is sent",
        },
      ],
      expectedResult: "The user receives a password reset message",
      testData: ["registered@example.com"],
    },
  ],
});

test("test designer validates test cases and references", async () => {
  const provider = new FixtureProvider([validOutput]);
  const service = new TestDesignerService(
    provider,
    "prompts/test-designer.v1.prompt",
  );

  const output = await service.design(input);

  assert.equal(output.testCases[0]?.scenarioId, "REQ-SC-001");
  assert.equal(output.testCases[0]?.steps[0]?.number, 1);
  assert.equal(provider.calls, 1);
});

test("test designer retries after schema failure", async () => {
  const provider = new FixtureProvider(["{}", validOutput]);
  const service = new TestDesignerService(
    provider,
    "prompts/test-designer.v1.prompt",
  );

  const output = await service.design(input);

  assert.equal(output.testCases.length, 1);
  assert.equal(provider.calls, 2);
});

test("test designer rejects unknown scenarios after retries", async () => {
  const invalidOutput = validOutput.replace(
    "REQ-SC-001",
    "REQ-SC-999",
  );
  const provider = new FixtureProvider([
    invalidOutput,
    invalidOutput,
  ]);
  const service = new TestDesignerService(
    provider,
    "prompts/test-designer.v1.prompt",
  );

  await assert.rejects(
    service.design(input),
    /after 2 attempts/i,
  );
});