import type { NextFunction, Request, Response } from "express";

import { failureTriageService } from "./failure-triage.service";

export class FailureTriageController {
  static async triage(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = await failureTriageService.triage(
        req.body,
      );
      return res.status(200).json({
        success: true,
        message: "Failure triage completed.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}