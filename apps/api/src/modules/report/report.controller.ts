import type { NextFunction, Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { successResponse } from "../../utils/response";
import { ReportService } from "./report.service";

type ReportParams = { id: string };

export class ReportController {
  static async get(
    req: AuthenticatedRequest<ReportParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const report = await ReportService.getAnalysisReport(req.user.userId, req.params.id);
      return successResponse(res, "Analysis report generated.", report);
    } catch (error) {
      next(error);
    }
  }

  static async download(
    req: AuthenticatedRequest<ReportParams>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const report = await ReportService.getAnalysisReport(req.user.userId, req.params.id);
      res.type("text/markdown");
      res.setHeader("Content-Disposition", `attachment; filename="analysis-${req.params.id}.md"`);
      return res.send(ReportService.toMarkdown(report));
    } catch (error) {
      next(error);
    }
  }
}