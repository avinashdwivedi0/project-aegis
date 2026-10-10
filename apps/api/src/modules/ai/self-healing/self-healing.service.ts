import fs from "fs/promises";
import path from "path";

import { aiConfig } from "../../../config/ai.config";
import { prisma } from "../../../config/prisma";
import { AuditLogger } from "../../../utils/audit-logger";
import type { AgentProvider } from "../agents/agent.provider";
import { GroqAgentProvider } from "../agents/gemini.provider";
import { resolvePromptPath } from "../prompt-path";

import {
  canTransitionSelfHealingStatus,
  canRetrySelfHealingStatus,
  containsForbiddenXPathSelector,
  MAX_SELF_HEALING_RETRIES,
  resolveSelfHealingValidationOutcome,
  selfHealingInputSchema,
  selfHealingProposalSchema,
  type SelfHealingInput,
  type SelfHealingLifecycleStatus,
} from "./self-healing.types";
import { localSelfHealingService } from "./local-self-healing.service";

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
    if (process.env.AGENT_MODE?.trim() === "local") {
      return localSelfHealingService.propose(ownerId, validatedInput);
    }

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

    const proposal = selfHealingProposalSchema.parse({
      ...(typeof parsed === "object" && parsed !== null ? parsed : {}),
      contractVersion: "1.0",
    });
    if (containsForbiddenXPathSelector(proposal.locator)) {
      throw new Error(
        "Self-Healing Agent returned a prohibited XPath locator.",
      );
    }

    const saved = await prisma.selfHealingProposal.create({
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
    return { ...saved, contractVersion: proposal.contractVersion, locator: proposal.locator };
  }

  async list(ownerId: string, repositoryId?: string, status?: SelfHealingLifecycleStatus) {
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

  async transitionLifecycle(
    ownerId: string,
    proposalId: string,
    status: SelfHealingLifecycleStatus,
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

    if (!canTransitionSelfHealingStatus(proposal.status, status)) {
      throw new Error(
        `Invalid self-healing transition from ${proposal.status} to ${status}.`,
      );
    }

    const updatedProposal = await prisma.selfHealingProposal.update({
      where: { id: proposalId },
      data: {
        status,
        reviewedAt: status === "APPROVED" || status === "REJECTED" ? new Date() : proposal.reviewedAt,
      },
    });

    await AuditLogger.record(
      ownerId,
      `SELF_HEAL_${status}`,
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

  async review(
    ownerId: string,
    proposalId: string,
    status: "APPROVED" | "REJECTED",
  ) {
    return this.transitionLifecycle(ownerId, proposalId, status);
  }

  async retry(
    ownerId: string,
    proposalId: string,
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

    if (proposal.status !== "ROLLED_BACK" && proposal.status !== "REJECTED") {
      throw new Error(
        `Proposal cannot be retried while in ${proposal.status} state.`,
      );
    }

    if (!canRetrySelfHealingStatus(proposal.status, proposal.retryCount)) {
      throw new Error(
        `Proposal has reached the maximum of ${MAX_SELF_HEALING_RETRIES} retries.`,
      );
    }

    const nextRetryCount = proposal.retryCount + 1;
    const retryResult = await prisma.selfHealingProposal.updateMany({
      where: {
        id: proposalId,
        status: proposal.status,
        retryCount: proposal.retryCount,
      },
      data: {
        retryCount: { increment: 1 },
      },
    });

    if (retryResult.count !== 1) {
      throw new Error("Proposal changed state or reached the maximum retry limit.");
    }

    const retriedProposal = await this.propose(ownerId, {
      repositoryId: proposal.repositoryId,
      testRunId: proposal.testRunId,
      testCaseId: proposal.testCaseId,
      failedLocator: proposal.failedLocator,
      domSnapshot: proposal.domSnapshot,
      screenshot: proposal.screenshot,
    });
    const updatedRetry = await prisma.selfHealingProposal.update({
      where: { id: retriedProposal.id },
      data: {
        retryCount: nextRetryCount,
        parentProposalId: proposal.id,
        reasoning: `${retriedProposal.reasoning}\nRetry ${nextRetryCount} generated from proposal ${proposal.id}.`,
      },
    });

    await AuditLogger.record(
      ownerId,
      "SELF_HEAL_RETRY",
      "SelfHealingProposal",
      proposalId,
      {
        strategy: proposal.strategy,
        confidence: proposal.confidence,
        previousStatus: proposal.status,
        retryCount: nextRetryCount,
        generatedProposalId: retriedProposal.id,
      },
      true,
    );

    return updatedRetry;
  }

  async validate(
    ownerId: string,
    proposalId: string,
    passed: boolean,
    reason?: string,
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

    if (proposal.status !== "APPROVED") {
      throw new Error(
        `Proposal must be APPROVED before validation. Current status: ${proposal.status}.`,
      );
    }

    const validatingStatus: SelfHealingLifecycleStatus = "VALIDATING";
    const nextStatus = resolveSelfHealingValidationOutcome(passed);

    const updatedProposal = await prisma.selfHealingProposal.update({
      where: { id: proposalId },
      data: {
        status: validatingStatus,
        reviewedAt: new Date(),
      },
    });

    const finalProposal = await prisma.selfHealingProposal.update({
      where: { id: proposalId },
      data: {
        status: nextStatus,
        reviewedAt: new Date(),
        reasoning: reason && reason.trim().length > 0
          ? `${proposal.reasoning}\nValidation: ${reason.trim()}`
          : proposal.reasoning,
      },
    });

    await AuditLogger.record(
      ownerId,
      passed ? "SELF_HEAL_VALIDATED" : "SELF_HEAL_ROLLED_BACK",
      "SelfHealingProposal",
      proposalId,
      {
        strategy: proposal.strategy,
        confidence: proposal.confidence,
        previousStatus: proposal.status,
        validationPassed: passed,
        reason: reason ?? null,
      },
      true,
    );

    return finalProposal;
  }
}

export const selfHealingService =
  new SelfHealingService();
