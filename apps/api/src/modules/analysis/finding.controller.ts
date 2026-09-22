import type { NextFunction, Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { successResponse } from "../../utils/response";

import { FindingService, type FindingQuery } from "./finding.service";

type FindingParams = { id: string };

export class FindingController {
  static async list(
    req: AuthenticatedRequest<FindingParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const findings = await FindingService.list(
        req.user.userId,
        req.params.id,
        req.query as FindingQuery,
      );
      return successResponse(res, findings);
    } catch (error) {
      next(error);
    }
  }

  static async score(
    req: AuthenticatedRequest<FindingParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const score = await FindingService.score(
        req.user.userId,
        req.params.id,
      );
      return successResponse(res, score);
    } catch (error) {
      next(error);
    }
  }
}
