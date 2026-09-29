import { z } from "zod";

export const createRepositorySchema = {
  body: z.object({
    name: z
      .string()
      .trim()
      .min(
        3,
        "Repository name must be at least 3 characters"
      )
      .max(
        150,
        "Repository name cannot exceed 150 characters"
      ),

    description: z
      .string()
      .trim()
      .max(
        1000,
        "Description cannot exceed 1000 characters"
      )
      .optional(),

    provider: z
      .enum([
        "LOCAL",
        "GITHUB",
        "ZIP",
      ])
      .optional(),

    url: z
      .string()
      .url("Invalid repository URL")
      .optional(),

    defaultBranch: z
      .string()
      .trim()
      .max(100)
      .optional(),

    isPrivate: z
      .boolean()
      .optional(),

    workspacePath: z
      .string()
      .optional(),
  }),

  params: z.object({
    projectId: z.string().min(1),
  }),
};

export const updateRepositorySchema = {
  body: z.object({
    name: z
      .string()
      .trim()
      .min(3)
      .max(150)
      .optional(),

    description: z
      .string()
      .trim()
      .max(1000)
      .optional(),

    provider: z
      .enum([
        "LOCAL",
        "GITHUB",
        "ZIP",
      ])
      .optional(),

    url: z
      .string()
      .url()
      .optional(),

    defaultBranch: z
      .string()
      .trim()
      .max(100)
      .optional(),

    isPrivate: z
      .boolean()
      .optional(),

    status: z
      .enum([
        "ACTIVE",
        "INDEXING",
        "INDEXED",
        "FAILED",
        "ARCHIVED",
      ])
      .optional(),

    workspacePath: z
      .string()
      .optional(),
  }),

  params: z.object({
    id: z.string().min(1),
  }),
};

export const repositoryParamsSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
};

export const projectRepositoryParamsSchema = {
  params: z.object({
    projectId: z.string().min(1),
  }),
};

export const repositoryQuerySchema = {
  query: z.object({
    search: z
      .string()
      .optional(),

    provider: z
      .enum([
        "LOCAL",
        "GITHUB",
        "ZIP",
      ])
      .optional(),

    status: z
      .enum([
        "ACTIVE",
        "INDEXING",
        "INDEXED",
        "FAILED",
        "ARCHIVED",
      ])
      .optional(),
  }),
};