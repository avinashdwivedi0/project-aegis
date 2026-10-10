import { z } from "zod";

export const unitRunInputSchema = z.object({
  repositoryId: z.string().min(1),
  suite: z.enum(["password-helpers", "exported-components"]),
});
export type UnitRunInput = z.infer<typeof unitRunInputSchema>;

export const integrationRunInputSchema = z.object({
  repositoryId: z.string().min(1),
  suite: z.enum(["signup-login", "new-order", "dashboard-data"]),
  baseUrl: z.string().url().refine((value) => {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  }, "Use an HTTP(S) URL without embedded credentials."),
});
export type IntegrationRunInput = z.infer<typeof integrationRunInputSchema>;

export const securityRunInputSchema = z.object({ repositoryId: z.string().min(1) });
export type SecurityRunInput = z.infer<typeof securityRunInputSchema>;
