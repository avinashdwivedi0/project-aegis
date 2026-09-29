import fs from "fs/promises";
import path from "path";

import { aiConfig } from "../../../config/ai.config";
import { prisma } from "../../../config/prisma";
import type { AgentProvider } from "../agents/agent.provider";
import { GroqAgentProvider } from "../agents/gemini.provider";
import { resolvePromptPath } from "../prompt-path";

import {
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
    if (process.env.AGENT_MODE !== "local") {
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
    if (proposal.locator.includes("xpath") || proposal.locator.includes("//")) {
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
    // Parse DOM snapshot to find candidate locators
    const candidates = this.findCandidateLocators(
      input.domSnapshot,
      input.failedLocator,
    );

    if (candidates.length === 0) {
      throw new Error(
        "No alternative locators found in the DOM snapshot for the failed locator.",
      );
    }

    // Pick the best candidate (highest confidence heuristic)
    const best = candidates[0];

    return prisma.selfHealingProposal.create({
      data: {
        repositoryId: input.repositoryId,
        testRunId: input.testRunId,
        testCaseId: input.testCaseId,
        failedLocator: input.failedLocator,
        domSnapshot: input.domSnapshot,
        screenshot: input.screenshot,
        strategy: best.strategy,
        proposedLocator: best.locator,
        confidence: best.confidence,
        reasoning: `Local heuristic: tried ${candidates.length} strategy(ies). Selected ${best.strategy} with confidence ${best.confidence}.`,
        status: "PENDING",
      },
    });
  }

  private findCandidateLocators(
    domSnapshot: string,
    failedLocator: string,
  ): Array<{ strategy: string; locator: string; confidence: number }> {
    const candidates: Array<{
      strategy: string;
      locator: string;
      confidence: number;
    }> = [];

    // Extract element info from DOM snapshot
    const elementMatches = domSnapshot.matchAll(
      /<(\w+)[^>]*data-testid="([^"]*)"[^>]*>/gi,
    );
    for (const match of elementMatches) {
      candidates.push({
        strategy: "id-fallback",
        locator: `[data-testid="${match[2]}"]`,
        confidence: 0.85,
      });
    }

    // Try role-based
    const roleMatches = domSnapshot.matchAll(
      /role="([^"]*)"[^>]*>/gi,
    );
    for (const match of roleMatches) {
      candidates.push({
        strategy: "role-fallback",
        locator: `[role="${match[1]}"]`,
        confidence: 0.7,
      });
    }

    // Try class-based fallback
    const classMatches = domSnapshot.matchAll(
      /class="([^"]*)"[^>]*>/gi,
    );
    for (const match of classMatches) {
      const classes = match[1].split(/\s+/).filter(Boolean);
      if (classes.length > 0) {
        candidates.push({
          strategy: "class-fallback",
          locator: `.${classes[0]}`,
          confidence: 0.6,
        });
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    return candidates.filter((c) => {
      if (seen.has(c.locator)) return false;
      seen.add(c.locator);
      return true;
    });
  }
}

export const localSelfHealingService = new LocalSelfHealingService();