import { z } from "zod";

export const requirementScenarioPrioritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
]);

export const requirementScenarioSchema = z.object({
  id: z.string().regex(/^REQ-SC-\d{3,}$/),
  title: z.string().trim().min(1),
  preconditions: z.array(z.string().trim().min(1)),
  priority: requirementScenarioPrioritySchema,
});

export const requirementAnalysisInputSchema = z.object({
  requirement: z.string().trim().min(1).max(50_000),
});

export const requirementAnalysisOutputSchema = z.object({
  contractVersion: z.literal("1.0"),
  scenarios: z.array(requirementScenarioSchema),
});

export type RequirementAnalysisInput = z.infer<
  typeof requirementAnalysisInputSchema
>;
export type RequirementScenario = z.infer<
  typeof requirementScenarioSchema
>;
export type RequirementAnalysisOutput = z.infer<
  typeof requirementAnalysisOutputSchema
>;