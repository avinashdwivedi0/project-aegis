import { z } from "zod";

export const guardrailParamsSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
};

export const upsertGuardrailSchema = {
  body: z.object({
    maxPatchRiskScore: z
      .number()
      .int("maxPatchRiskScore must be an integer")
      .min(0, "maxPatchRiskScore must be >= 0")
      .max(100, "maxPatchRiskScore must be <= 100")
      .optional(),
    requireManualApprovalForCritical: z.boolean().optional(),
    sandboxOnly: z.boolean().optional(),
    scope: z
      .enum(["ADVISORY", "ENFORCED"])
      .optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
};