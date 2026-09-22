import { z } from "zod";

export const registerBodySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const preferencesBodySchema = z.object({
  defaultRef: z.string().trim().min(1).max(200).default("HEAD"),
  polling: z.boolean().default(true),
}).strict();

export const registerSchema = {
  body: registerBodySchema,
};

export const loginSchema = {
  body: loginBodySchema,
};

export const preferencesSchema = {
  body: preferencesBodySchema,
};