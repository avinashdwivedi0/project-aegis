import { z } from "zod";

export const AGENT_CONTRACT_VERSION = "1.0";

export const agentIdSchema = z.enum([
  "project-analyzer",
  "code-quality",
  "security",
  "dependency",
  "test",
  "api",
  "ui-accessibility",
  "performance",
  "repair",
  "report",
]);

export const agentEvidenceSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  source: z.string().min(1),
  content: z.string(),
  filePath: z.string().optional(),
  lineStart: z.number().int().positive().optional(),
  lineEnd: z.number().int().positive().optional(),
});

export const agentInputSchema = z.object({
  contractVersion: z.literal(AGENT_CONTRACT_VERSION),
  agentId: agentIdSchema,
  runId: z.string().min(1),
  projectId: z.string().min(1),
  repositoryId: z.string().min(1),
  projectProfile: z.record(z.string(), z.unknown()),
  evidence: z.array(agentEvidenceSchema),
  promptVersion: z.string().min(1),
  model: z.string().min(1),
});

export const findingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  confidence: z.number().min(0).max(1),
  evidenceIds: z.array(z.string().min(1)),
  filePath: z.string().optional(),
  lineStart: z.number().int().positive().optional(),
  lineEnd: z.number().int().positive().optional(),
  recommendation: z.string().min(1),
  repairRequired: z.boolean(),
});

export const agentOutputSchema = z.object({
  contractVersion: z.literal(AGENT_CONTRACT_VERSION),
  agentId: agentIdSchema,
  agentVersion: z.string().min(1),
  status: z.enum(["completed", "skipped", "failed"]),
  findings: z.array(findingSchema),
  summary: z.string(),
  skippedReason: z.string().optional(),
  errorCode: z.string().optional(),
  durationMs: z.number().int().nonnegative(),
});

export type AgentId = z.infer<typeof agentIdSchema>;
export type AgentInput = z.infer<typeof agentInputSchema>;
export type AgentOutput = z.infer<typeof agentOutputSchema>;
export type AgentEvidence = z.infer<typeof agentEvidenceSchema>;
