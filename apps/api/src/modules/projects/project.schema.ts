import { z } from "zod";

export const createProjectSchema = {
  body: z.object({
    name: z
      .string()
      .trim()
      .min(3, "Project name must be at least 3 characters")
      .max(100, "Project name cannot exceed 100 characters"),

    description: z
      .string()
      .trim()
      .max(500, "Description cannot exceed 500 characters")
      .optional(),
  }),
};

export const updateProjectSchema = {
  body: z.object({
    name: z
      .string()
      .trim()
      .min(3)
      .max(100)
      .optional(),

    description: z
      .string()
      .trim()
      .max(500)
      .optional(),

    status: z
      .enum([
        "ACTIVE",
        "ARCHIVED",
        "COMPLETED",
      ])
      .optional(),

    visibility: z
      .enum([
        "PRIVATE",
        "TEAM",
        "PUBLIC",
      ])
      .optional(),
  }),

  params: z.object({
    id: z.string().min(1),
  }),
};

export const projectParamsSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
};