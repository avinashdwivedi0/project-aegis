import fs from "fs/promises";
import path from "path";

import { aiConfig } from "../../../config/ai.config";
import type { AgentProvider } from "../agents/agent.provider";
import { GroqAgentProvider } from "../agents/gemini.provider";
import { resolvePromptPath } from "../prompt-path";

import {
  testDesignInputSchema,
  testDesignOutputSchema,
  type TestDesignInput,
  type TestDesignOutput,
} from "./test-design.types";

const PROMPT_PATH = path.resolve(
  process.cwd(),
  "prompts",
  "test-designer.v1.prompt",
);

export class TestDesignerService {
  constructor(
    private readonly provider: AgentProvider =
      new GroqAgentProvider(),
    private readonly promptPath = PROMPT_PATH,
    private readonly maxAttempts = 2,
  ) {}

  async design(
    input: TestDesignInput,
  ): Promise<TestDesignOutput> {
    const validatedInput = testDesignInputSchema.parse(input);
    const promptTemplate = await fs.readFile(
      resolvePromptPath(this.promptPath),
      "utf8",
    );
    const scenarios = JSON.stringify(
      validatedInput.scenarios,
      null,
      2,
    );
    const prompt = promptTemplate.replace(
      "{{SCENARIOS}}",
      scenarios,
    );
    let lastError: unknown;

    for (let attempt = 0; attempt < this.maxAttempts; attempt += 1) {
      try {
        const raw = await this.provider.generate({
          agentId: "test-designer",
          model: aiConfig.chatModel,
          prompt,
        });
        const parsed = JSON.parse(raw) as unknown;
        const output = testDesignOutputSchema.parse(parsed);

        if (
          validatedInput.scenarios.length > 0 &&
          output.testCases.length === 0
        ) {
          throw new Error(
            "Test Designer returned no test cases for the supplied scenarios.",
          );
        }

        this.validateScenarioReferences(output, validatedInput);
        this.validateStepOrdering(output);

        return output;
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(
      `Test Designer returned invalid structured output after ${this.maxAttempts} attempts: ${lastError instanceof Error ? lastError.message : "unknown validation error"}`,
    );
  }

  private validateScenarioReferences(
    output: TestDesignOutput,
    input: TestDesignInput,
  ): void {
    const scenarioIds = new Set(
      input.scenarios.map((scenario) => scenario.id),
    );

    for (const testCase of output.testCases) {
      if (!scenarioIds.has(testCase.scenarioId)) {
        throw new Error(
          `Test case ${testCase.id} references an unknown scenario.`,
        );
      }
    }
  }

  private validateStepOrdering(output: TestDesignOutput): void {
    for (const testCase of output.testCases) {
      const numbers = testCase.steps.map(
        (step) => step.number,
      );
      const expected = numbers.map((_, index) => index + 1);

      if (JSON.stringify(numbers) !== JSON.stringify(expected)) {
        throw new Error(
          `Test case ${testCase.id} steps must be numbered sequentially.`,
        );
      }
    }
  }
}

export const testDesignerService =
  new TestDesignerService();