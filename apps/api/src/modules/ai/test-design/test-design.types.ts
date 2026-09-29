import { z } from "zod";

import {
  requirementScenarioSchema,
  requirementScenarioPrioritySchema,
} from "../requirements/requirement.types";

export const testDesignInputSchema = z.object({
  contractVersion: z.literal("1.0"),
  scenarios: z.array(requirementScenarioSchema),
});

export const testStepSchema = z.object({
  number: z.number().int().positive(),
  action: z.string().trim().min(1),
  expectedResult: z.string().trim().min(1),
});

export const testCaseSchema = z.object({
  id: z.string().regex(/^REQ-TC-\d{3,}$/),
  scenarioId: z.string().regex(/^REQ-SC-\d{3,}$/),
  title: z.string().trim().min(1),
  priority: requirementScenarioPrioritySchema,
  preconditions: z.array(z.string().trim().min(1)),
  steps: z.array(testStepSchema).min(1),
  expectedResult: z.string().trim().min(1),
  testData: z.array(z.string().trim().min(1)),
});

export const testDesignOutputSchema = z.object({
  contractVersion: z.literal("1.0"),
  testCases: z.array(testCaseSchema),
});

export type TestDesignInput = z.infer<
  typeof testDesignInputSchema
>;
export type TestStep = z.infer<typeof testStepSchema>;
export type TestCase = z.infer<typeof testCaseSchema>;
export type TestDesignOutput = z.infer<
  typeof testDesignOutputSchema
>;