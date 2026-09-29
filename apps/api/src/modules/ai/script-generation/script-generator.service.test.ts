import assert from "node:assert/strict";
import test from "node:test";

import type { AgentProvider } from "../agents/agent.provider";

import { ScriptGeneratorService } from "./script-generator.service";

const input = {
  contractVersion: "1.0" as const,
  approved: true as const,
  testCases: [
    {
      id: "REQ-TC-001",
      scenarioId: "REQ-SC-001",
      title: "Reset password",
      priority: "high" as const,
      preconditions: ["A registered account exists"],
      steps: [
        {
          number: 1,
          action: "Open the reset form",
          expectedResult: "The reset form is visible",
        },
      ],
      expectedResult: "The reset request is accepted",
      testData: ["registered@example.com"],
    },
  ],
};

class FixtureProvider implements AgentProvider {
  constructor(private readonly response: string) {}

  async generate(): Promise<string> {
    return this.response;
  }
}

test("script generator returns validated Playwright TypeScript", async () => {
  const provider = new FixtureProvider(
    JSON.stringify({
      contractVersion: "1.0",
      files: [
        {
          path: "tests/REQ-TC-001.spec.ts",
          language: "typescript",
          testCaseId: "REQ-TC-001",
          content: [
            "import { test, expect } from '@playwright/test';",
            "test('Reset password', async ({ page }) => {",
            "  await page.getByRole('button', { name: 'Reset' }).click();",
            "  await expect(page.getByText('Reset request accepted')).toBeVisible();",
            "});",
          ].join("\n"),
        },
      ],
    }),
  );
  const service = new ScriptGeneratorService(
    provider,
    "prompts/script-generator.v1.prompt",
  );

  const output = await service.generate(input);

  assert.equal(output.files[0]?.language, "typescript");
  assert.match(output.files[0]?.content ?? "", /getByRole/);
});

test("script generator rejects unapproved or unsafe output", async () => {
  const provider = new FixtureProvider(
    JSON.stringify({
      contractVersion: "1.0",
      files: [
        {
          path: "tests/REQ-TC-001.spec.ts",
          language: "typescript",
          testCaseId: "REQ-TC-999",
          content: "import { test } from '@playwright/test';\ntest('x', async () => {});",
        },
      ],
    }),
  );
  const service = new ScriptGeneratorService(
    provider,
    "prompts/script-generator.v1.prompt",
  );

  await assert.rejects(
    service.generate(input),
    /unapproved test case/i,
  );
});