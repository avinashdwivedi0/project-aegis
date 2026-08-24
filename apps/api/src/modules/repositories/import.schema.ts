import { z } from "zod";

export const importGitHubSchema = {
  params: z.object({
    id: z.string().min(1, "Repository ID is required"),
  }),

  body: z.object({
    url: z
      .string()
      .url("Invalid GitHub repository URL")
      .regex(
        /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(\.git)?$/,
        "Invalid GitHub repository URL"
      ),
  }),
};