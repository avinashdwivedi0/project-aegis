import { z } from "zod";

const testTargetUrl = z.string().url().refine((value) => {
  const url = new URL(value);
  return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
}, "Use an HTTP(S) URL without embedded credentials.");

export const liveRunModeInputSchema = z.object({
  repositoryId: z.string().min(1),
  mode: z.enum(["smoke", "sanity", "system", "regression", "acceptance"]),
  frontendUrl: testTargetUrl.optional(),
  dashboardUrl: testTargetUrl.optional(),
  integrationBaseUrl: testTargetUrl.optional(),
});
export type LiveRunModeInput = z.infer<typeof liveRunModeInputSchema>;
