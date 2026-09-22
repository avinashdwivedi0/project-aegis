import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { requirementAnalystService } from "./requirement-analyst.service";

export class RequirementController {
  static async analyze(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await requirementAnalystService.analyze(
        req.body,
      );

      return res.status(200).json({
        success: true,
        message: "Requirement scenarios generated successfully.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}