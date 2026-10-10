import { z } from "zod";

export const runHistoryParamsSchema = z.object({
  repositoryId: z.string().min(1),
});
