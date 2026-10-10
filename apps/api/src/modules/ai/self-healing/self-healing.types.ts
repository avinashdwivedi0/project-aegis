import { z } from "zod";

export type SelfHealingLifecycleStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "VALIDATING"
  | "VALIDATED"
  | "ROLLED_BACK";

export const MAX_SELF_HEALING_RETRIES = 3;

export function containsForbiddenXPathSelector(value: string): boolean {
  if (!value) return false;

  const normalized = value.replace(/\s+/g, " ").trim();
  return /(^|\W)(xpath\s*[:=]|\/\/)/i.test(normalized)
    || /\(\s*\/\//.test(normalized)
    || /\[\s*\/\//.test(normalized)
    || /\/\*\[/.test(normalized);
}

export function canTransitionSelfHealingStatus(
  current: string,
  next: SelfHealingLifecycleStatus,
): boolean {
  const transitions: Record<string, Set<SelfHealingLifecycleStatus>> = {
    PENDING: new Set(["APPROVED", "REJECTED"]),
    APPROVED: new Set(["VALIDATING", "VALIDATED", "REJECTED", "ROLLED_BACK"]),
    VALIDATING: new Set(["VALIDATED", "ROLLED_BACK"]),
    VALIDATED: new Set([]),
    REJECTED: new Set(["PENDING"]),
    ROLLED_BACK: new Set(["PENDING"]),
  };

  return transitions[current]?.has(next) ?? false;
}

export function canRetrySelfHealingStatus(
  status: string,
  retryCount: number,
  maxRetries = MAX_SELF_HEALING_RETRIES,
): boolean {
  return (status === "ROLLED_BACK" || status === "REJECTED")
    && Number.isInteger(retryCount)
    && retryCount >= 0
    && retryCount < maxRetries;
}

export function resolveSelfHealingValidationOutcome(
  passed: boolean,
): "VALIDATED" | "ROLLED_BACK" {
  return passed ? "VALIDATED" : "ROLLED_BACK";
}

export const selfHealingInputSchema = z.object({
  repositoryId: z.string().min(1),
  testRunId: z.string().min(1),
  testCaseId: z.string().regex(/^REQ-TC-\d{3,}$/),
  failedLocator: z.string().trim().min(1).max(2_000),
  domSnapshot: z.string().trim().min(1).max(2_000_000),
  screenshot: z.string().trim().min(1).max(10_000_000),
});

export const manualSelfHealingValidationSchema = z.object({
  passed: z.literal(false),
  reason: z.string().trim().max(5_000).optional(),
});

export const healingStrategySchema = z.enum([
  "role",
  "test-id",
  "text",
  "css",
]);

export const selfHealingProposalSchema = z.object({
  contractVersion: z.literal("1.0"),
  strategy: healingStrategySchema,
  locator: z.string().trim().min(1).max(2_000),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().trim().min(1).max(5_000),
});

export type SelfHealingInput = z.infer<
  typeof selfHealingInputSchema
>;
export type SelfHealingProposal = z.infer<
  typeof selfHealingProposalSchema
>;