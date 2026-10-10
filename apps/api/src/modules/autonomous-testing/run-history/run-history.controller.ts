import type { NextFunction, Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/auth.middleware.js";
import { runHistoryService } from "./run-history.service.js";

export class RunHistoryController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await runHistoryService.list(req.user.userId, req.params.repositoryId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
