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

export const registerSchema = {
  body: registerBodySchema,
};

export const loginSchema = {
  body: loginBodySchema,
};