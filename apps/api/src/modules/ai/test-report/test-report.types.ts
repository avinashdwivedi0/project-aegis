import { z } from "zod";

export const testReportQuerySchema = z.object({
  repositoryId: z.string().min(1),
});

export const testRunHistorySchema = z.object({
  runId: z.string(),
  status: z.enum(["passed", "failed", "timedOut", "cancelled"]),
  total: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  passRate: z.number().min(0).max(1),
  durationMs: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export const testReportSchema = z.object({
  repositoryId: z.string(),
  runHistory: z.array(testRunHistorySchema),
  passRateTrend: z.array(z.object({
    runId: z.string(),
    createdAt: z.string(),
    passRate: z.number().min(0).max(1),
  })),
  flakyTests: z.array(z.object({
    title: z.string(),
    runs: z.number().int().positive(),
    failures: z.number().int().positive(),
    failureRate: z.number().min(0).max(1),
  })),
  slowTests: z.array(z.object({
    title: z.string(),
    averageDurationMs: z.number().nonnegative(),
    runs: z.number().int().positive(),
  })),
  releaseReadiness: z.object({
    ready: z.boolean(),
    score: z.number().min(0).max(100),
    reasons: z.array(z.string()),
  }),
});

export type TestReport = z.infer<typeof testReportSchema>;