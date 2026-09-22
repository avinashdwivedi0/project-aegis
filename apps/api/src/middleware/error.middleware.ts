import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};

    for (const issue of err.issues) {
      const field = issue.path[0] as string;

      if (!errors[field]) {
        errors[field] = [];
      }

      errors[field].push(issue.message);
    }

    return res.status(400).json({
      success: false,
      message: err.issues[0]?.message ?? "Validation failed",
      errors,
    });
  }

  console.error(err);

  const message =
    err instanceof Error
      ? err.message
      : "Internal Server Error";

  return res.status(500).json({
    success: false,
    message,
  });
}