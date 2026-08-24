import { z } from "zod";

export const chatSchema = {
  body: z.object({
    repositoryId: z
      .string()
      .trim()
      .min(1, "Repository ID is required."),

    message: z
      .string()
      .trim()
      .min(1, "Message is required.")
      .max(10000, "Message is too long."),
  }),
};