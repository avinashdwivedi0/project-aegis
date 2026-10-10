import type { NextFunction, Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/auth.middleware.js";
import { blackBoxRunService } from "./black-box-run.service.js";

export class BlackBoxRunController {
  static async run(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await blackBoxRunService.run(req.user.userId, req.body);
      return res.status(200).json({
        success: true,
        message: "Inferred black-box flow generated and executed.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async rerun(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await blackBoxRunService.rerun(req.user.userId, req.body);
      return res.status(200).json({
        success: true,
        message: "Previously generated black-box test was executed as a regression run.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
