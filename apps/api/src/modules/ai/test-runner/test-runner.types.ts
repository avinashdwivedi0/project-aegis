import { z } from "zod";

import { generatedPlaywrightFileSchema } from "../script-generation/script-generation.types";

export const testRunnerInputSchema = z.object({
  runId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  repositoryId: z.string().min(1).optional(),
  workspace: z.string().min(1),
  files: z.array(generatedPlaywrightFileSchema).min(1),
  parallelism: z.number().int().min(1).max(16).default(2),
  timeoutMs: z.number().int().positive().max(900_000).default(180_000),
});

export const testResultSchema = z.object({
  title: z.string(),
  status: z.enum(["passed", "failed", "skipped", "timedOut"]),
  durationMs: z.number().nonnegative(),
  error: z.string().optional(),
  screenshot: z.string().optional(),
  trace: z.string().optional(),
});

export const testRunnerOutputSchema = z.object({
  runId: z.string(),
  repositoryId: z.string().optional(),
  createdAt: z.string().datetime(),
  status: z.enum(["passed", "failed", "timedOut", "cancelled"]),
  total: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  resultsDirectory: z.string().min(1),
  tests: z.array(testResultSchema),
  stdout: z.string(),
  stderr: z.string(),
  durationMs: z.number().int().nonnegative(),
});

export type TestRunnerInput = z.input<typeof testRunnerInputSchema>;
export type TestResult = z.infer<typeof testResultSchema>;
export type TestRunnerOutput = z.infer<typeof testRunnerOutputSchema>;