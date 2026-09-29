import assert from "node:assert/strict";
import test from "node:test";

import type {
  AgentProvider,
  AgentProviderRequest,
} from "../agents/agent.provider";

import { RequirementAnalystService } from "./requirement-analyst.service";

class FixtureProvider implements AgentProvider {
  public request: AgentProviderRequest | undefined;

  constructor(private readonly response: string) {}

  async generate(request: AgentProviderRequest): Promise<string> {
    this.request = request;
    return this.response;
  }
}

test("requirement analyst validates structured scenarios", async () => {
  const provider = new FixtureProvider(
    JSON.stringify({
      contractVersion: "1.0",
      scenarios: [
        {
          id: "REQ-SC-001",
          title: "User resets a password with a verified email",
          preconditions: ["The user has an existing account"],
          priority: "high",
        },
      ],
    }),
  );
  const service = new RequirementAnalystService(
    provider,
    "prompts/requirement-analyst.v1.prompt",
  );

  const output = await service.analyze({
    requirement:
      "Users can reset their password using a verified email address.",
  });

  assert.equal(output.scenarios.length, 1);
  assert.equal(output.scenarios[0]?.priority, "high");
  assert.match(
    provider.request?.prompt ?? "",
    /Users can reset their password/,
  );
});

test("requirement analyst rejects malformed provider output", async () => {
  const service = new RequirementAnalystService(
    new FixtureProvider("not-json"),
    "prompts/requirement-analyst.v1.prompt",
  );

  await assert.rejects(
    service.analyze({ requirement: "A testable requirement." }),
    /invalid JSON/i,
  );
});