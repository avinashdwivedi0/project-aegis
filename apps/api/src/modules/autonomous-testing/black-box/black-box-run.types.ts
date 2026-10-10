import { z } from "zod";

const webUrl = z.string().url().refine((value) => {
  const url = new URL(value);
  return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
}, "Use an HTTP(S) URL without embedded credentials.");

export const blackBoxRunInputSchema = z.object({
  repositoryId: z.string().min(1),
  frontendUrl: webUrl,
  dashboardUrl: webUrl,
});

export const blackBoxRerunInputSchema = z.object({
  repositoryId: z.string().min(1),
  baselineRunId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
});

export type BlackBoxRunInput = z.infer<typeof blackBoxRunInputSchema>;
export type BlackBoxRerunInput = z.infer<typeof blackBoxRerunInputSchema>;
