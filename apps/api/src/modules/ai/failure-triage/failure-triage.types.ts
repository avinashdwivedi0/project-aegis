import { z } from "zod";

export const failureInputSchema = z.object({
  id: z.string().min(1),
  testCaseId: z.string().regex(/^REQ-TC-\d{3,}$/),
  message: z.string().trim().min(1).max(10_000),
  stackTrace: z.string().trim().max(20_000).default(""),
  screenshot: z.string().trim().max(10_000_000).optional(),
});

export const failureTriageInputSchema = z.object({
  failures: z.array(failureInputSchema).min(1).max(500),
});

export const failureClassificationSchema = z.enum([
  "real_bug",
  "locator_change",
  "flaky",
  "environment_issue",
]);

export const failureGroupSchema = z.object({
  groupId: z.string().regex(/^FAIL-GRP-\d{3,}$/),
  failureIds: z.array(z.string().min(1)).min(1),
  representativeFailureId: z.string().min(1),
  duplicateCount: z.number().int().positive(),
  message: z.string().min(1),
  stackTrace: z.string(),
  screenshot: z.string().optional(),
});

export const failureTriageResultSchema = z.object({
  groupId: z.string().regex(/^FAIL-GRP-\d{3,}$/),
  classification: failureClassificationSchema,
  reasoning: z.string().trim().min(1).max(500),
});

export const failureTriageOutputSchema = z.object({
  contractVersion: z.literal("1.0"),
  groups: z.array(failureTriageResultSchema),
});

export type FailureInput = z.infer<typeof failureInputSchema>;
export type FailureGroup = z.infer<typeof failureGroupSchema>;
export type FailureTriageInput = z.infer<typeof failureTriageInputSchema>;
export type FailureTriageOutput = z.infer<typeof failureTriageOutputSchema>;