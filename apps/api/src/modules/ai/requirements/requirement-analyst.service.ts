import fs from "fs/promises";
import path from "path";

import { aiConfig } from "../../../config/ai.config";
import type {
  AgentProvider,
} from "../agents/agent.provider";
import { GroqAgentProvider } from "../agents/gemini.provider";

import {
  requirementAnalysisInputSchema,
  requirementAnalysisOutputSchema,
  type RequirementAnalysisInput,
  type RequirementAnalysisOutput,
} from "./requirement.types";

const PROMPT_PATH = path.resolve(
  process.cwd(),
  "prompts",
  "requirement-analyst.v1.md",
);

export class RequirementAnalystService {
  constructor(
    private readonly provider: AgentProvider =
      new GroqAgentProvider(),
    private readonly promptPath = PROMPT_PATH,
  ) {}

  async analyze(
    input: RequirementAnalysisInput,
  ): Promise<RequirementAnalysisOutput> {
    const validatedInput =
      requirementAnalysisInputSchema.parse(input);
    const promptTemplate = await fs.readFile(
      this.promptPath,
      "utf8",
    );
    const prompt = promptTemplate.replace(
      "{{REQUIREMENT}}",
      validatedInput.requirement,
    );
    const raw = await this.provider.generate({
      agentId: "requirement-analyst",
      model: aiConfig.chatModel,
      prompt,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(
        "Requirement analyst returned invalid JSON.",
      );
    }

    return requirementAnalysisOutputSchema.parse(parsed);
  }
}

export const requirementAnalystService =
  new RequirementAnalystService();