import fs from "fs/promises";
import path from "path";

import { aiConfig } from "../../../config/ai.config";
import { prisma } from "../../../config/prisma";
import { AuditLogger } from "../../../utils/audit-logger";
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

export class SelfHealingService {
  constructor(
    private readonly provider: AgentProvider =
      new GroqAgentProvider(),
    private readonly promptPath = PROMPT_PATH,
  ) {}

  async propose(
    ownerId: string,
    input: SelfHealingInput,
  ) {
    const validatedInput = selfHealingInputSchema.parse(input);
    const repository = await prisma.repository.findFirst({
      where: {
        id: validatedInput.repositoryId,
        project: {
          ownerId,
        },
      },
      select: { id: true },
    });

    if (!repository) {
      throw new Error(
        "Repository not found or access denied.",
      );
    }

    const template = await fs.readFile(
      resolvePromptPath(this.promptPath),
      "utf8",
    );
    const prompt = template
      .replace("{{FAILED_LOCATOR}}", validatedInput.failedLocator)
      .replace("{{DOM_SNAPSHOT}}", validatedInput.domSnapshot)
      .replace("{{SCREENSHOT}}", validatedInput.screenshot);
    const raw = await this.provider.generate({
      agentId: "self-healing",
      model: aiConfig.chatModel,
      prompt,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(
        "Self-Healing Agent returned invalid JSON.",
      );
    }

    const proposal = selfHealingProposalSchema.parse(parsed);
    if (proposal.locator.includes("xpath") || proposal.locator.includes("//")) {
      throw new Error(
        "Self-Healing Agent returned a prohibited XPath locator.",
      );
    }

    return prisma.selfHealingProposal.create({
      data: {
        repositoryId: validatedInput.repositoryId,
        testRunId: validatedInput.testRunId,
        testCaseId: validatedInput.testCaseId,
        failedLocator: validatedInput.failedLocator,
        domSnapshot: validatedInput.domSnapshot,
        screenshot: validatedInput.screenshot,
        strategy: proposal.strategy,
        proposedLocator: proposal.locator,
        confidence: proposal.confidence,
        reasoning: proposal.reasoning,
        status: "PENDING",
      },
    });
  }

  async list(ownerId: string, repositoryId?: string, status?: "PENDING" | "APPROVED" | "REJECTED") {
    return prisma.selfHealingProposal.findMany({
      where: {
        repository: {
          project: { ownerId },
        },
        repositoryId,
        ...(status && { status }),
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
      where: {
        id: proposalId,
        repository: {
          project: { ownerId },
        },
      },
    });

    if (!proposal) {
      throw new Error(
        "Self-healing proposal not found or access denied.",
      );
    }

    if (proposal.status !== "PENDING") {
      throw new Error("Only pending proposals can be reviewed.");
    }

    const updatedProposal = await prisma.selfHealingProposal.update({
      where: { id: proposalId },
      data: {
        status,
        reviewedAt: new Date(),
      },
    });

    // Audit log the review action
    await AuditLogger.record(
      ownerId,
      status === "APPROVED" ? "SELF_HEAL_APPROVE" : "SELF_HEAL_REJECT",
      "SelfHealingProposal",
      proposalId,
      {
        strategy: proposal.strategy,
        confidence: proposal.confidence,
        previousStatus: proposal.status,
      },
      true,
    );

    return updatedProposal;
  }
}

export const selfHealingService =
  new SelfHealingService();