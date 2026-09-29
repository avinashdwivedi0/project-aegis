import { z } from "zod";

export const selfHealingInputSchema = z.object({
  repositoryId: z.string().min(1),
  testRunId: z.string().min(1),
  testCaseId: z.string().regex(/^REQ-TC-\d{3,}$/),
  failedLocator: z.string().trim().min(1).max(2_000),
  domSnapshot: z.string().trim().min(1).max(2_000_000),
  screenshot: z.string().trim().min(1).max(10_000_000),
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