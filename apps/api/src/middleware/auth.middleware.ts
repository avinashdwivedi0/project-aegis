import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";
import { errorResponse } from "../utils/response";

export interface AuthenticatedRequest<
  P = Record<string, string>
> extends Request<P> {
  user: {
    userId: string;
    email: string;
    role: "USER" | "ADMIN";
  };
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse(res, "Unauthorized", 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyToken(token);

    (req as AuthenticatedRequest).user = payload;

    next();
  } catch {
    return errorResponse(
      res,
      "Invalid or expired token",
      401
    );
  }
}