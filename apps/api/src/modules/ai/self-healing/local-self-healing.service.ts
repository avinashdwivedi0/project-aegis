import fs from "fs/promises";
import path from "path";

import { aiConfig } from "../../../config/ai.config";
import { prisma } from "../../../config/prisma";
import type { AgentProvider } from "../agents/agent.provider";
import { GroqAgentProvider } from "../agents/gemini.provider";
import { resolvePromptPath } from "../prompt-path";

import {
  containsForbiddenXPathSelector,
  selfHealingInputSchema,
  selfHealingProposalSchema,
  type SelfHealingInput,
} from "./self-healing.types";

const PROMPT_PATH = path.resolve(
  process.cwd(),
  "prompts",
  "self-healing.v1.prompt",
);

/**
 * Heuristic locators that can be attempted when the original locator fails.
 * Each strategy is tried in order; the first one that matches is proposed.
 */
const LOCAL_HEALING_STRATEGIES = [
  {
    name: "id-fallback",
    description: "Try data-testid or id attribute based on element text.",
  },
  {
    name: "role-fallback",
    description: "Try ARIA role + text content match.",
  },
  {
    name: "class-fallback",
    description: "Try CSS class pattern matching.",
  },
  {
    name: "text-fallback",
    description: "Try text content-based selector.",
  },
] as const;

type LocatorCandidate = {
  strategy: "test-id-fallback" | "id-fallback" | "role-fallback" | "class-fallback";
  locator: string;
  confidence: number;
};

export function findUniqueCandidateLocators(domSnapshot: string): LocatorCandidate[] {
  const elements = [...domSnapshot.matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)].map((match) => {
    const attributes = new Map<string, string>();
    for (const attribute of match[2].matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)) {
      attributes.set(attribute[1].toLowerCase(), attribute[3]);
    }
    return attributes;
  });
  const candidates: LocatorCandidate[] = [];

  function countMatches(predicate: (attributes: Map<string, string>) => boolean) {
    return elements.filter(predicate).length;
  }

  for (const attributes of elements) {
    const testId = attributes.get("data-testid");
    if (testId && countMatches((candidate) => candidate.get("data-testid") === testId) === 1) {
      candidates.push({
        strategy: "test-id-fallback",
        locator: `[data-testid=${JSON.stringify(testId)}]`,
        confidence: 0.95,
      });
    }

    const id = attributes.get("id");
    if (id && countMatches((candidate) => candidate.get("id") === id) === 1) {
      candidates.push({
        strategy: "id-fallback",
        locator: `[id=${JSON.stringify(id)}]`,
        confidence: 0.9,
      });
    }

    const role = attributes.get("role");
    if (role && countMatches((candidate) => candidate.get("role") === role) === 1) {
      candidates.push({
        strategy: "role-fallback",
        locator: `[role=${JSON.stringify(role)}]`,
        confidence: 0.8,
      });
    }

    const classes = [...new Set((attributes.get("class") ?? "").split(/\s+/).filter(Boolean))];
    for (const tokenCount of [Math.min(classes.length, 2), 1]) {
      if (tokenCount < 1) continue;
      const tokens = classes.slice(0, tokenCount);
      const locator = tokens.map((token) => `[class~=${JSON.stringify(token)}]`).join("");
      const matches = countMatches((candidate) => {
        const candidateClasses = new Set((candidate.get("class") ?? "").split(/\s+/));
        return tokens.every((token) => candidateClasses.has(token));
      });
      if (matches === 1) {
        candidates.push({
          strategy: "class-fallback",
          locator,
          confidence: tokenCount > 1 ? 0.68 : 0.6,
        });
      }
    }
  }

  const uniqueCandidates = new Map<string, LocatorCandidate>();
  for (const candidate of candidates) {
    const previous = uniqueCandidates.get(candidate.locator);
    if (!previous || candidate.confidence > previous.confidence) {
      uniqueCandidates.set(candidate.locator, candidate);
    }
  }
  return [...uniqueCandidates.values()].sort((left, right) => right.confidence - left.confidence);
}

/**
 * LocalSelfHealingService produces locator proposals using deterministic
 * heuristics instead of an LLM call.
 */
export class LocalSelfHealingService {
  constructor(
    private readonly provider: AgentProvider = new GroqAgentProvider(),
    private readonly promptPath = PROMPT_PATH,
  ) {}

  async propose(ownerId: string, input: SelfHealingInput) {
    const validatedInput = selfHealingInputSchema.parse(input);
    const repository = await prisma.repository.findFirst({
      where: {
        id: validatedInput.repositoryId,
        project: { ownerId },
      },
      select: { id: true },
    });

    if (!repository) {
      throw new Error("Repository not found or access denied.");
    }

    // LLM mode: use original prompt-based approach
    if (process.env.AGENT_MODE?.trim() !== "local") {
      return this.proposeWithLLM(validatedInput);
    }

    // Local mode: rule-based locator healing
    return this.proposeLocal(validatedInput);
  }

  async list(ownerId: string, repositoryId?: string) {
    return prisma.selfHealingProposal.findMany({
      where: {
        repository: { project: { ownerId } },
        repositoryId,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async review(
    ownerId: string,
    proposalId: string,
    status: "APPROVED" | "REJECTED",
  ) {
    const proposal = await prisma.selfHealingProposal.findFirst({
      where: { id: proposalId, repository: { project: { ownerId } } },
    });

    if (!proposal) {
      throw new Error("Self-healing proposal not found or access denied.");
    }

    if (proposal.status !== "PENDING") {
      throw new Error("Only pending proposals can be reviewed.");
    }

    return prisma.selfHealingProposal.update({
      where: { id: proposalId },
      data: { status, reviewedAt: new Date() },
    });
  }

  private async proposeWithLLM(input: SelfHealingInput) {
    const template = await fs.readFile(resolvePromptPath(this.promptPath), "utf8");
    const prompt = template
      .replace("{{FAILED_LOCATOR}}", input.failedLocator)
      .replace("{{DOM_SNAPSHOT}}", input.domSnapshot)
      .replace("{{SCREENSHOT}}", input.screenshot);

    const raw = await this.provider.generate({
      agentId: "self-healing",
      model: aiConfig.chatModel,
      prompt,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Self-Healing Agent returned invalid JSON.");
    }

    const proposal = selfHealingProposalSchema.parse(parsed);
    if (containsForbiddenXPathSelector(proposal.locator)) {
      throw new Error("Self-Healing Agent returned a prohibited XPath locator.");
    }

    return prisma.selfHealingProposal.create({
      data: {
        repositoryId: input.repositoryId,
        testRunId: input.testRunId,
        testCaseId: input.testCaseId,
        failedLocator: input.failedLocator,
        domSnapshot: input.domSnapshot,
        screenshot: input.screenshot,
        strategy: proposal.strategy,
        proposedLocator: proposal.locator,
        confidence: proposal.confidence,
        reasoning: proposal.reasoning,
        status: "PENDING",
      },
    });
  }

  private async proposeLocal(input: SelfHealingInput) {
    const candidates = findUniqueCandidateLocators(input.domSnapshot);

    if (candidates.length === 0) {
      throw new Error(
        "No alternative locators found in the DOM snapshot for the failed locator.",
      );
    }

    // Pick the best candidate (highest confidence heuristic)
    const best = candidates[0];
    const strategy = best.strategy === "test-id-fallback"
      ? "test-id"
      : best.strategy === "role-fallback"
        ? "role"
        : "css";
    const validatedProposal = selfHealingProposalSchema.parse({
      contractVersion: "1.0",
      strategy,
      locator: best.locator,
      confidence: best.confidence,
      reasoning: `Local heuristic: tried ${candidates.length} strategy(ies). Selected ${best.strategy} with confidence ${best.confidence}.`,
    });

    const saved = await prisma.selfHealingProposal.create({
      data: {
        repositoryId: input.repositoryId,
        testRunId: input.testRunId,
        testCaseId: input.testCaseId,
        failedLocator: input.failedLocator,
        domSnapshot: input.domSnapshot,
        screenshot: input.screenshot,
        strategy: validatedProposal.strategy,
        proposedLocator: validatedProposal.locator,
        confidence: validatedProposal.confidence,
        reasoning: validatedProposal.reasoning,
        status: "PENDING",
      },
    });
    return { ...saved, contractVersion: validatedProposal.contractVersion, locator: validatedProposal.locator };
  }

}

export const localSelfHealingService = new LocalSelfHealingService();
