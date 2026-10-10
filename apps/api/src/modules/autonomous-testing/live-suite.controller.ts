import type { NextFunction, Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";
import { liveSuiteService } from "./live-suite.service.js";

export class LiveSuiteController {
  static async runUnit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await liveSuiteService.runUnit(req.user.userId, req.body);
      res.status(200).json({ success: true, message: "Generated unit suite executed in the repository sandbox.", data });
    } catch (error) { next(error); }
  }

  static async runIntegration(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await liveSuiteService.runIntegration(req.user.userId, req.body);
      res.status(200).json({ success: true, message: "Generated integration suite executed against the supplied running service.", data });
    } catch (error) { next(error); }
  }

  static async runSecurity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await liveSuiteService.runSecurity(req.user.userId, req.body);
      res.status(200).json({ success: true, message: "Repository security checks completed.", data });
    } catch (error) { next(error); }
  }
}
