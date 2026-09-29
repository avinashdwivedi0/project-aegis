import fs from "fs/promises";
import path from "path";

import { aiConfig } from "../../../config/ai.config";
import type { AgentProvider } from "../agents/agent.provider";
import { GroqAgentProvider } from "../agents/gemini.provider";
import { resolvePromptPath } from "../prompt-path";

import {
  failureTriageInputSchema,
  failureTriageOutputSchema,
  type FailureGroup,
  type FailureInput,
  type FailureTriageInput,
  type FailureTriageOutput,
} from "./failure-triage.types";

const PROMPT_PATH = path.resolve(
  process.cwd(),
  "prompts",
  "failure-triage.v1.prompt",
);

export class FailureTriageService {
  constructor(
    private readonly provider: AgentProvider =
      new GroqAgentProvider(),
    private readonly promptPath = PROMPT_PATH,
  ) {}

  async triage(
    input: FailureTriageInput,
  ): Promise<FailureTriageOutput & { failureGroups: FailureGroup[] }> {
    const validatedInput = failureTriageInputSchema.parse(input);
    const failureGroups = this.groupFailures(
      validatedInput.failures,
    );
    const template = await fs.readFile(
      resolvePromptPath(this.promptPath),
      "utf8",
    );
    const prompt = template.replace(
      "{{FAILURE_GROUPS}}",
      JSON.stringify(failureGroups, null, 2),
    );
    const raw = await this.provider.generate({
      agentId: "failure-triage",
      model: aiConfig.chatModel,
      prompt,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Failure Triage Agent returned invalid JSON.");
    }

    const output = failureTriageOutputSchema.parse(parsed);
    const expectedIds = new Set(failureGroups.map((group) => group.groupId));
    const actualIds = new Set(output.groups.map((group) => group.groupId));

    if (
      actualIds.size !== expectedIds.size ||
      [...expectedIds].some((id) => !actualIds.has(id))
    ) {
      throw new Error(
        "Failure Triage Agent did not classify every failure group exactly once.",
      );
    }

    return {
      ...output,
      failureGroups,
    };
  }

  private groupFailures(failures: FailureInput[]): FailureGroup[] {
    const groups: Array<{
      failures: FailureInput[];
      tokens: Set<string>;
    }> = [];

    for (const failure of failures) {
      const tokens = this.tokens(failure);
      const matchingGroup = groups.find((group) =>
        this.similarity(tokens, group.tokens) >= 0.7,
      );

      if (matchingGroup) {
        matchingGroup.failures.push(failure);
        matchingGroup.tokens = new Set([
          ...matchingGroup.tokens,
          ...tokens,
        ]);
      } else {
        groups.push({ failures: [failure], tokens });
      }
    }

    return groups.map((group, index) => {
      const representative = group.failures[0];
      return {
        groupId: `FAIL-GRP-${String(index + 1).padStart(3, "0")}`,
        failureIds: group.failures.map((failure) => failure.id),
        representativeFailureId: representative.id,
        duplicateCount: group.failures.length,
        message: representative.message,
        stackTrace: representative.stackTrace,
        screenshot: representative.screenshot,
      };
    });
  }

  private tokens(failure: FailureInput): Set<string> {
    return new Set(
      `${failure.message} ${failure.stackTrace}`
        .toLowerCase()
        .replace(/[^a-z0-9_./:-]+/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 3),
    );
  }

  private similarity(left: Set<string>, right: Set<string>): number {
    const intersection = [...left].filter((token) => right.has(token)).length;
    const union = new Set([...left, ...right]).size;
    return union === 0 ? 1 : intersection / union;
  }
}

export const failureTriageService =
  new FailureTriageService();