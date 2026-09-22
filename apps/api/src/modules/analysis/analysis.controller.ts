import type { NextFunction, Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { successResponse } from "../../utils/response";

import { AnalysisService } from "./analysis.service";
import { AnalysisQueue } from "./analysis.queue";

type AnalysisParams = {
  id: string;
};

export class AnalysisController {
  static async list(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const runs = await AnalysisService.list(req.user.userId);
      return successResponse(res, "Analysis runs loaded.", runs);
    } catch (error) {
      next(error);
    }
  }

  static async create(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const run = await AnalysisService.create(
        req.user.userId,
        req.body,
      );
      await AnalysisQueue.enqueue(
        req.user.userId,
        run.id,
      );
      return successResponse(
        res,
        run,
        "Analysis run created.",
        201,
      );
    } catch (error) {
      next(error);
    }
  }

  static async get(
    req: AuthenticatedRequest<AnalysisParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const run = await AnalysisService.get(
        req.user.userId,
        req.params.id,
      );
      return successResponse(res, run);
    } catch (error) {
      next(error);
    }
  }

  static async start(
    req: AuthenticatedRequest<AnalysisParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const run = await AnalysisService.start(
        req.user.userId,
        req.params.id,
      );
      return successResponse(res, run);
    } catch (error) {
      next(error);
    }
  }

  static async events(
    req: AuthenticatedRequest<AnalysisParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const after = typeof req.query.after === "string"
        ? new Date(req.query.after)
        : undefined;
      const events = await AnalysisService.events(
        req.user.userId,
        req.params.id,
        after && !Number.isNaN(after.valueOf())
          ? after
          : undefined,
      );
      return successResponse(res, events);
    } catch (error) {
      next(error);
    }
  }

  static async summary(
    req: AuthenticatedRequest<AnalysisParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const summary = await AnalysisService.summary(
        req.user.userId,
        req.params.id,
      );
      return successResponse(res, summary);
    } catch (error) {
      next(error);
    }
  }

  static async progress(
    req: AuthenticatedRequest<AnalysisParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const run = await AnalysisService.updateProgress(
        req.user.userId,
        req.params.id,
        req.body,
      );
      return successResponse(res, run);
    } catch (error) {
      next(error);
    }
  }

  static async complete(
    req: AuthenticatedRequest<AnalysisParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const run = await AnalysisService.complete(
        req.user.userId,
        req.params.id,
      );
      return successResponse(res, run);
    } catch (error) {
      next(error);
    }
  }

  static async cancel(
    req: AuthenticatedRequest<AnalysisParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const run = await AnalysisService.cancel(
        req.user.userId,
        req.params.id,
      );
      return successResponse(res, run);
    } catch (error) {
      next(error);
    }
  }

  static async retry(
    req: AuthenticatedRequest<AnalysisParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const run = await AnalysisService.retry(req.user.userId, req.params.id);
      await AnalysisQueue.enqueue(req.user.userId, run.id);
      return successResponse(res, "Analysis retry queued.", run);
    } catch (error) {
      next(error);
    }
  }
}
