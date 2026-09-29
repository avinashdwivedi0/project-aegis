import type { NextFunction, Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/auth.middleware";
import { testReportService } from "./test-report.service";

export class TestReportController {
  static async get(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const repositoryId = req.query.repositoryId;
      if (typeof repositoryId !== "string" || !repositoryId.trim()) {
        return res.status(400).json({
          success: false,
          message: "repositoryId query parameter is required.",
        });
      }
      const data = await testReportService.get(
        req.user.userId,
        repositoryId,
      );
      return res.status(200).json({
        success: true,
        message: "Test operations report generated.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}