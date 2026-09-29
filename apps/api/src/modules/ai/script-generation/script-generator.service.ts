import fs from "fs/promises";
import path from "path";

import { aiConfig } from "../../../config/ai.config";
import type { AgentProvider } from "../agents/agent.provider";
import { GroqAgentProvider } from "../agents/gemini.provider";
import { resolvePromptPath } from "../prompt-path";

import {
  scriptGenerationInputSchema,
  scriptGenerationOutputSchema,
  type ScriptGenerationInput,
  type ScriptGenerationOutput,
} from "./script-generation.types";

const PROMPT_PATH = path.resolve(
  process.cwd(),
  "prompts",
  "script-generator.v1.prompt",
);

export class ScriptGeneratorService {
  constructor(
    private readonly provider: AgentProvider =
      new GroqAgentProvider(),
    private readonly promptPath = PROMPT_PATH,
  ) {}

  async generate(
    input: ScriptGenerationInput,
  ): Promise<ScriptGenerationOutput> {
    const validatedInput =
      scriptGenerationInputSchema.parse(input);
    const promptTemplate = await fs.readFile(
      resolvePromptPath(this.promptPath),
      "utf8",
    );
    const prompt = promptTemplate.replace(
      "{{TEST_CASES}}",
      JSON.stringify(validatedInput.testCases, null, 2),
    );
    const raw = await this.provider.generate({
      agentId: "script-generator",
      model: aiConfig.chatModel,
      prompt,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(
        "Script Generator returned invalid JSON.",
      );
    }

    const output = scriptGenerationOutputSchema.parse(parsed);
    this.validateFiles(output, validatedInput);
    return output;
  }

  private validateFiles(
    output: ScriptGenerationOutput,
    input: ScriptGenerationInput,
  ): void {
    const approvedIds = new Set(
      input.testCases.map((testCase) => testCase.id),
    );
    const generatedIds = new Set<string>();

    for (const file of output.files) {
      if (!approvedIds.has(file.testCaseId)) {
        throw new Error(
          `Generated script ${file.path} references an unapproved test case.`,
        );
      }

      if (generatedIds.has(file.testCaseId)) {
        throw new Error(
          `Generated more than one script for ${file.testCaseId}.`,
        );
      }

      if (!file.content.includes("@playwright/test")) {
        throw new Error(
          `Generated script ${file.path} is not a Playwright test.`,
        );
      }

      if (file.content.includes("xpath=")) {
        throw new Error(
          `Generated script ${file.path} uses a prohibited XPath locator.`,
        );
      }

      generatedIds.add(file.testCaseId);
    }

    if (generatedIds.size !== approvedIds.size) {
      throw new Error(
        "Script Generator did not produce one script for every approved test case.",
      );
    }
  }
}

export const scriptGeneratorService =
  new ScriptGeneratorService();