import { z } from "zod";

export const testWorkflowInputSchema = z.object({
  projectId: z.string().min(1),
  repositoryId: z.string().min(1),
  requirement: z.string().trim().min(1).max(50_000),
  parallelism: z.number().int().min(1).max(16).default(2),
  approved: z.literal(true, {
    error: "Workflow execution requires explicit human approval before running.",
  }),
});

export type TestWorkflowInput = z.input<
  typeof testWorkflowInputSchema
>;