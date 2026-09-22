import { AnalysisStatus } from "@prisma/client";
import { z } from "zod";

const analysisToolSchema = z.object({
  command: z.enum(["node", "npm", "pnpm", "python", "semgrep"]),
  args: z.array(z.string().max(500)).max(30),
  stage: z.string().min(1).max(100),
});

export const analysisAdapterSchema = z.enum([
  "typescript",
  "eslint",
  "dependency-audit",
  "security-scan",
  "test-runner",
  "api-probe",
  "browser-accessibility",
  "performance",
]);

export const createAnalysisSchema = z.object({
  projectId: z.string().min(1),
  repositoryId: z.string().min(1),
  ref: z.string().min(1).default("HEAD"),
  totalStages: z.number().int().min(0).max(100).default(0),
  tools: z.array(analysisToolSchema).max(100).default([]),
  adapters: z.array(analysisAdapterSchema).max(8).default([]),
});

export const updateAnalysisProgressSchema = z.object({
  completedStages: z.number().int().min(0),
  currentStage: z.string().min(1).nullable().optional(),
});

export type CreateAnalysisInput = z.infer<
  typeof createAnalysisSchema
>;

export type UpdateAnalysisProgressInput = z.infer<
  typeof updateAnalysisProgressSchema
>;

export type AnalysisToolInput = z.infer<
  typeof analysisToolSchema
>;

export type AnalysisAdapter = z.infer<typeof analysisAdapterSchema>;

export { AnalysisStatus };
