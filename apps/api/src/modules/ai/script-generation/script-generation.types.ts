import { z } from "zod";

import {
  testCaseSchema,
} from "../test-design/test-design.types";

export const scriptGenerationInputSchema = z.object({
  contractVersion: z.literal("1.0"),
  approved: z.literal(true),
  testCases: z.array(testCaseSchema).min(1),
});

export const generatedPlaywrightFileSchema = z.object({
  path: z.string().regex(/^tests\/.+\.spec\.ts$/),
  language: z.literal("typescript"),
  testCaseId: z.string().regex(/^REQ-TC-\d{3,}$/),
  content: z.string().min(1),
});

export const scriptGenerationOutputSchema = z.object({
  contractVersion: z.literal("1.0"),
  files: z.array(generatedPlaywrightFileSchema).min(1),
});

export type ScriptGenerationInput = z.infer<
  typeof scriptGenerationInputSchema
>;
export type GeneratedPlaywrightFile = z.infer<
  typeof generatedPlaywrightFileSchema
>;
export type ScriptGenerationOutput = z.infer<
  typeof scriptGenerationOutputSchema
>;